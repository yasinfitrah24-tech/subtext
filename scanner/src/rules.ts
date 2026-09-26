import { Finding, Rule } from "./types";

// ---------------------------------------------------------------------------
// Helper: test whether a U+200D (ZWJ) in `line` is sandwiched between emoji
// codepoints (i.e. legitimate family/profession emoji sequences).
// We detect emoji using the broad Unicode range for emoji and emoji modifiers.
// ---------------------------------------------------------------------------
export function isEmojiZwj(line: string, zwjIndex: number): boolean {
  // `zwjIndex` is the UTF-16 string offset of the U+200D character.
  // We need the codepoint neighbours (left and right of ZWJ).
  // Spread into actual Unicode codepoints and walk to find the ZWJ position.
  const codePoints = [...line]; // surrogate pairs → single entry each

  function isEmojiCp(ch: string | undefined): boolean {
    if (!ch) return false;
    const cp = ch.codePointAt(0)!;
    // Variation selectors, skin tone modifiers
    if (cp === 0xFE0F || cp === 0xFE0E) return true;
    if (cp >= 0x1F3FB && cp <= 0x1F3FF) return true;
    // Core emoji ranges
    if (cp >= 0x1F000 && cp <= 0x1FFFF) return true; // misc supplemental (includes most emoji)
    if (cp >= 0x2600 && cp <= 0x27BF) return true;   // misc symbols & dingbats
    if (cp >= 0x1F900 && cp <= 0x1F9FF) return true; // supplemental symbols
    if (cp >= 0x1FA00 && cp <= 0x1FAFF) return true; // extended pictographic
    // Gender / role signs commonly used in ZWJ sequences
    if (cp === 0x2640 || cp === 0x2642 || cp === 0x2695 || cp === 0x2696 || cp === 0x2708) return true;
    return false;
  }

  // Find the codepoint index of the ZWJ by accumulating UTF-16 lengths
  let utf16Offset = 0;
  for (let cpIdx = 0; cpIdx < codePoints.length; cpIdx++) {
    if (utf16Offset === zwjIndex) {
      // codePoints[cpIdx] is the ZWJ; check neighbours
      return isEmojiCp(codePoints[cpIdx - 1]) && isEmojiCp(codePoints[cpIdx + 1]);
    }
    utf16Offset += codePoints[cpIdx].length; // .length is 2 for surrogate pairs, 1 otherwise
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helper: create a Finding from a line match
// ---------------------------------------------------------------------------
function finding(
  filePath: string,
  lineNumber: number,
  rule: Rule["id"],
  raw: string
): Finding {
  const snippet = raw.length > 120 ? raw.slice(0, 117) + "..." : raw;
  return { file: filePath, line: lineNumber, rule, snippet: snippet.trim() };
}

// ---------------------------------------------------------------------------
// Helpers: file kind and "prose" view of a file
//
// Prompt injection is written in natural language. In a code file it hides in
// comments; in Markdown it hides in prose, not in fenced code blocks. Rules
// that look for natural-language instructions (ACTION_VERB_NEAR_SECRET) read
// this prose view so that ordinary code such as `delete process.env.X` or
// `.send('password=...')` in a test file is never treated as an instruction.
// ---------------------------------------------------------------------------
const CODE_EXT =
  /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|php|java|go|rs|sh|bash|zsh|fish|ps1|css|scss|sass|less|c|h|cc|cpp|cs|swift|kt)$/i;
const HASH_COMMENT_EXT = /\.(py|rb|sh|bash|zsh|fish|ps1|ya?ml|toml)$/i;
const MARKDOWN_EXT = /\.(md|markdown|mdx|mdc|rst|txt)$/i;

export function isCodeFile(filePath: string): boolean {
  return CODE_EXT.test(filePath);
}

/** Returns one entry per line: the natural-language part of that line ("" if none). */
export function proseLines(lines: string[], filePath: string): string[] {
  if (MARKDOWN_EXT.test(filePath)) {
    let inFence = false;
    return lines.map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return "";
      }
      return inFence ? "" : line;
    });
  }
  if (!CODE_EXT.test(filePath)) return lines.slice();

  const hash = HASH_COMMENT_EXT.test(filePath);
  let inBlock = false;
  return lines.map((line) => {
    let out = "";
    let rest = line;
    if (inBlock) {
      const end = rest.indexOf("*/");
      if (end === -1) return rest.replace(/^\s*\*\s?/, "");
      out += rest.slice(0, end) + " ";
      rest = rest.slice(end + 2);
      inBlock = false;
    }
    const block = rest.indexOf("/*");
    if (block !== -1) {
      const end = rest.indexOf("*/", block + 2);
      if (end === -1) {
        inBlock = true;
        return out + rest.slice(block + 2);
      }
      out += rest.slice(block + 2, end) + " ";
    }
    const slash = rest.search(/(^|[^:])\/\//);
    if (slash !== -1) out += rest.slice(rest.indexOf("//", slash) + 2);
    if (hash) {
      const h = rest.search(/(^|\s)#(?!!)/);
      if (h !== -1) out += rest.slice(rest.indexOf("#", h) + 1);
    }
    return out.trim();
  });
}

// ---------------------------------------------------------------------------
// Rule 1 — HTML/Markdown comments addressed to AI agents
// Catches: <!-- AI: ... -->, <!-- [INST] ... -->, <!-- system: ... -->
// and Markdown-style: [//]: # (AI: ...)
// ---------------------------------------------------------------------------
export const ruleCommentAiAddressed: Rule = {
  id: "COMMENT_AI_ADDRESSED",
  weight: 20,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Patterns that address an AI inside a comment
    // The comment must actually address an AI. Generic words like "ignore" or
    // "model" are not enough: `/* istanbul ignore next */` is a coverage pragma.
    const aiTerms =
      /\b(ai|llm|gpt|claude|gemini|copilot|chatgpt|assistant)\b|\b(ai|coding)\s+agent\b|\bsystem\s*:|\[\s*inst\s*\]|\bignore\s+(all\s+)?(previous|prior|above)\b|\byou\s+are\s+now\b/i;
    const toolPragma =
      /^\s*(istanbul|eslint|prettier|jshint|jscs|tslint|c8|v8|@ts-|global\s|webpack|#?__PURE__|@__PURE__|@license|@preserve|@flow|stylelint|biome)/i;

    lines.forEach((line, i) => {
      // HTML comments
      const htmlComment = /<!--([\s\S]*?)-->/.exec(line);
      if (htmlComment && aiTerms.test(htmlComment[1])) {
        findings.push(finding(filePath, i + 1, "COMMENT_AI_ADDRESSED", line));
        return;
      }
      // Markdown reference-link comments: [//]: # (text)
      const mdComment = /^\[\/\/\]:\s*#\s*\((.+)\)/.exec(line.trim());
      if (mdComment && aiTerms.test(mdComment[1])) {
        findings.push(finding(filePath, i + 1, "COMMENT_AI_ADDRESSED", line));
        return;
      }
      // CSS/JS block comments in non-code contexts that address AI
      const blockComment = /\/\*([\s\S]*?)\*\//.exec(line);
      if (
        blockComment &&
        !toolPragma.test(blockComment[1]) &&
        aiTerms.test(blockComment[1])
      ) {
        findings.push(finding(filePath, i + 1, "COMMENT_AI_ADDRESSED", line));
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 2 — "Ignore previous instructions"-style overrides
// ---------------------------------------------------------------------------
export const ruleIgnorePreviousInstructions: Rule = {
  id: "IGNORE_PREVIOUS_INSTRUCTIONS",
  weight: 40,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Core override phrases — flexible spacing/punctuation
    const overridePattern =
      /ignore\s+(all\s+)?(previous|prior|above|earlier|former)\s+(instructions?|prompts?|context|rules?|directives?)|disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)|forget\s+(everything|all)\s+(you\s+)?(know|were\s+told|above)|new\s+instructions?:|system\s*:\s*you\s+(are|must|should|will)|you\s+are\s+now\s+(a|an)\s+\w+|act\s+as\s+(a|an)\s+(unrestricted|jailbreak|DAN|uncensored)|do\s+anything\s+now|dan\s+mode|jailbreak\s+mode|\[\s*system\s*\]|\[INST\]|<\|system\|>|<\|im_start\|>/i;

    lines.forEach((line, i) => {
      if (overridePattern.test(line)) {
        findings.push(
          finding(filePath, i + 1, "IGNORE_PREVIOUS_INSTRUCTIONS", line)
        );
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 3 — Action verbs aimed at AI near secret keywords
//
// The action verb and the secret reference must appear on the same line or
// in the same sentence (split on "." / "!" / "?").  A plain command
// instruction like "Run `npm install`" that mentions no secret is never
// flagged even when a malicious line is nearby.
// ---------------------------------------------------------------------------
export const ruleActionVerbNearSecret: Rule = {
  id: "ACTION_VERB_NEAR_SECRET",
  weight: 35,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Verbs that expose or move a secret.
    const actionVerb =
      /\b(read|send|post|upload|exfiltrate|transmit|forward|export|leak|steal|dump|include|append|paste|print|reveal|share|email)\b/i;
    // Secret references: .env / process.env, token, api key, secret, credentials,
    // private key, bearer, jwt, ssh key, aws secret, gh token, id_rsa, ~/.ssh
    const secretKeyword =
      /(\.env\b|process\.env\b|\bid_rsa\b|~\/\.ssh\b|~\/\.aws\b|\b(?:api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|auth[_\s-]?token|password|passwd|credentials?|private[_\s-]?key|bearer|jwt|ssh[_\s-]?key|aws[_\s-]?secret|gh[_\s-]?token|pat|token)\b)/i;
    // Documentation talks about sending tokens all the time. An injection is
    // different: it is aimed at the agent, or it names a place to send to.
    const agentSignal =
      /\b(ai|llm|gpt|claude|gemini|copilot|chatgpt|assistant)\b|\b(ai|coding)\s+agent\b|\bsystem\s*:|\[\s*inst\s*\]/i;
    const sendVerb =
      /\b(send|post|upload|exfiltrate|transmit|forward|leak|email)\b/i;
    const destination = /https?:\/\/\S+|\b[\w-]+\.(invalid|example)\b/i;

    const prose = proseLines(lines, filePath);
    prose.forEach((text, i) => {
      if (!text || !actionVerb.test(text) || !secretKeyword.test(text)) return;

      // The verb and the secret must share one clause (split on sentence ends,
      // commas, semicolons and "then"), so "Copy .env.example to .env, then
      // run npm install" is not flagged.
      const clauses = text.split(/(?<=[.!?])\s+|[,;]|\bthen\b/i);
      const matched = clauses.some(
        (c) => actionVerb.test(c) && secretKeyword.test(c)
      );
      if (!matched) return;

      const aimed =
        agentSignal.test(text) ||
        (sendVerb.test(text) && destination.test(text));
      if (aimed) {
        findings.push(
          finding(filePath, i + 1, "ACTION_VERB_NEAR_SECRET", lines[i])
        );
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 4 — Zero-width and invisible Unicode characters
// U+200D (ZWJ) is excluded when it appears between emoji codepoints (e.g.
// family emoji 👨‍👩‍👧) to avoid false positives on legitimate emoji sequences.
// ---------------------------------------------------------------------------
export const ruleZeroWidthChars: Rule = {
  id: "ZERO_WIDTH_CHARS",
  weight: 30,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Zero-width space (200B), non-joiner (200C), joiner (200D),
    // word-joiner (2060), invisible function applicator (2061-2064),
    // soft-hyphen (00AD), zero-width no-break space / BOM (FEFF)
    const zwPattern =
      /[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/g;

    lines.forEach((line, i) => {
      // Quick pre-test before detailed scan
      if (!/[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/.test(line)) return;

      // Check each invisible character individually
      let hasRealHit = false;
      let m: RegExpExecArray | null;
      zwPattern.lastIndex = 0;
      while ((m = zwPattern.exec(line)) !== null) {
        const cp = m[0].codePointAt(0)!;
        // U+200D (ZWJ) inside an emoji sequence is benign
        if (cp === 0x200D && isEmojiZwj(line, m.index)) continue;
        // U+FEFF is a byte-order mark; code and tests use it on purpose.
        if (cp === 0xFEFF && (isCodeFile(filePath) || (i === 0 && m.index === 0))) continue;
        hasRealHit = true;
        break;
      }

      if (hasRealHit) {
        // Show escaped representation so hidden chars are visible in output
        const escaped = line.replace(
          /[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/g,
          (c, offset) => {
            const cp2 = c.codePointAt(0)!;
            if (cp2 === 0x200D && isEmojiZwj(line, offset)) return c;
            return `<U+${cp2.toString(16).toUpperCase().padStart(4, "0")}>`;
          }
        );
        findings.push(finding(filePath, i + 1, "ZERO_WIDTH_CHARS", escaped));
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 5 — Bidi override characters
// ---------------------------------------------------------------------------
export const ruleBidiOverride: Rule = {
  id: "BIDI_OVERRIDE",
  weight: 30,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // RLO, LRO, RLE, LRE, PDF, RLI, LRI, FSI, PDI
    const bidiPattern = /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/;

    lines.forEach((line, i) => {
      if (bidiPattern.test(line)) {
        const escaped = line.replace(
          /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g,
          (c) => `<U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}>`
        );
        findings.push(finding(filePath, i + 1, "BIDI_OVERRIDE", escaped));
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 6 — Base64 blobs that decode to instruction-like text
// ---------------------------------------------------------------------------
export const ruleBase64Instruction: Rule = {
  id: "BASE64_INSTRUCTION",
  weight: 35,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Match standalone base64 strings (≥40 chars, no surrounding word chars)
    const b64Pattern = /(?<![A-Za-z0-9+/])([A-Za-z0-9+/]{40,}={0,2})(?![A-Za-z0-9+/])/g;
    // Keywords that hint at instruction content once decoded
    const instructionHints =
      /ignore|system\s*:|you\s+are|act\s+as|instruction|prompt|override|disregard|forget|jailbreak|exec|eval|fetch|token|api[_\s]key|password/i;

    lines.forEach((line, i) => {
      let match: RegExpExecArray | null;
      b64Pattern.lastIndex = 0;
      while ((match = b64Pattern.exec(line)) !== null) {
        try {
          const decoded = Buffer.from(match[1], "base64").toString("utf8");
          // Only flag if decoded text is printable-ish and contains hints
          if (/^[\x20-\x7E\r\n\t]{10,}$/.test(decoded) && instructionHints.test(decoded)) {
            findings.push(
              finding(
                filePath,
                i + 1,
                "BASE64_INSTRUCTION",
                `${match[1].slice(0, 40)}… → "${decoded.slice(0, 80)}"`
              )
            );
          }
        } catch {
          // Not valid base64 — skip
        }
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 7 — Markdown image/link exfiltration URLs with query params
// ---------------------------------------------------------------------------
export const ruleExfiltrationUrl: Rule = {
  id: "EXFILTRATION_URL",
  weight: 25,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Match Markdown links/images: [text](url) or ![alt](url)
    // Flag when the URL has query params containing potentially sensitive names
    const mdUrlPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
    const sensitiveParam =
      /[?&](token|access_token|key|secret|auth|api[_-]?key|password|passwd|session|cookie|creds?|env|payload|prompt)=/i;
    // Also flag known canary/logging services
    const canaryHost =
      /\b(burpcollaborator\.net|interact\.sh|canarytokens\.org|webhook\.site|requestbin\.|ngrok\.io|pipedream\.net|oast\.|hookbin\.com)/i;

    lines.forEach((line, i) => {
      let match: RegExpExecArray | null;
      mdUrlPattern.lastIndex = 0;
      while ((match = mdUrlPattern.exec(line)) !== null) {
        const url = match[1];
        if (sensitiveParam.test(url) || canaryHost.test(url)) {
          findings.push(finding(filePath, i + 1, "EXFILTRATION_URL", line));
        }
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 8 — Instructions hidden in HTML attributes or alt text
// ---------------------------------------------------------------------------
export const ruleHtmlAttrInjection: Rule = {
  id: "HTML_ATTR_INJECTION",
  weight: 25,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Suspicious attribute names or values that contain instruction-like text
    const attrPattern =
      /(?:alt|title|aria-label|data-[a-z-]+|placeholder|value|name|id)\s*=\s*["']([^"']{20,})["']/gi;
    const instructionHints =
      /ignore|system:|you\s+are|act\s+as|instruction|prompt|override|disregard|forget|jailbreak|new\s+task|execute|your\s+(new\s+)?role/i;

    lines.forEach((line, i) => {
      let match: RegExpExecArray | null;
      attrPattern.lastIndex = 0;
      while ((match = attrPattern.exec(line)) !== null) {
        if (instructionHints.test(match[1])) {
          findings.push(
            finding(filePath, i + 1, "HTML_ATTR_INJECTION", line)
          );
        }
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 9 — Remote-exec patterns
// Detects: curl|bash, wget|sh, PowerShell IEX/DownloadString,
//          exec/eval of fetched content (requests.get, urllib, fetch, etc.)
//          and DNS-TXT-exec (dig TXT + bash -c).
// Rate: REVIEW by default (weight 25); combined with AI-addressed instruction
// the score climbs to BLOCK territory.
// ---------------------------------------------------------------------------
export const ruleRemoteExec: Rule = {
  id: "REMOTE_EXEC",
  weight: 25,
  check(content, lines, filePath) {
    const findings: Finding[] = [];

    // Pattern 1: pipe-to-shell  curl … | bash/sh/zsh/ash/dash
    const curlPipe = /\b(curl|wget)\b[^|\n]*\|\s*(ba)?sh\b/i;
    // Pattern 2: wget -O- … | sh  (already covered above, but be explicit)
    const wgetPipe = /\bwget\b[^|\n]*\|\s*(ba)?sh\b/i;
    // Pattern 3: PowerShell download-and-execute
    const psIex = /\b(IEX|Invoke-Expression)\s*[\(\s]|\.DownloadString\s*\(/i;
    // Pattern 4: exec/eval of fetched content in Python/JS/Ruby etc.
    const execFetch =
      /\b(exec|eval|compile)\s*\(\s*(?:[\w.]+\.(?:get|fetch|urlopen|read|text|content|decode)\s*[\(\[]|base64\.b64decode\s*\()/i;
    // Pattern 5: bash -c "$(dig … TXT …)" style DNS-exfil exec
    const dnsTxtExec = /\bbash\s+-c\s+["'`]\s*\$\(\s*dig\b/i;
    // Pattern 6: generic: shell -c "$(...)" with a download tool inside
    const shellCmdSub = /\b(?:ba)?sh\s+-c\s+["'`][^"'`]*\$\(\s*(?:curl|wget|dig|nslookup)/i;

    const patterns = [curlPipe, wgetPipe, psIex, execFetch, dnsTxtExec, shellCmdSub];

    lines.forEach((line, i) => {
      for (const pat of patterns) {
        if (pat.test(line)) {
          findings.push(finding(filePath, i + 1, "REMOTE_EXEC", line));
          break;
        }
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 10 — Coercion: telling the AI to hide actions or fake error messages
// ---------------------------------------------------------------------------
export const ruleCoercion: Rule = {
  id: "COERCION",
  weight: 30,
  check(content, lines, filePath) {
    const findings: Finding[] = [];

    // Hiding actions from the user
    const hideAction =
      /\b(do\s+not|don'?t)\s+(tell|inform|notify|mention|show|warn|ask|let)\s+(the\s+)?(user|developer|human|operator)\b/i;
    // "silently", "without telling/informing/notifying the user"
    // Imperative only ("Silently add ...", "you should silently run ..."), so a
    // threat model saying an attacker "can't silently change" something is fine.
    const silentAction =
      /(?:^|[.:;!>*-]\s*|\b(?:should|must|please|and|then|always)\s+)silently\s+(?:add|insert|inject|include|modify|delete|remove|run|execute|call|append|update|change)\b/i;
    // Fake-error coercion: "if you see [error], [the AI should] run ..."
    // Handles: backtick-quoted errors, plain names, with optional "the AI/assistant"
    const fakeError =
      /(?:if\s+you\s+see|when\s+you\s+(?:see|encounter|get))\s+[`'"]?[\w\s:.-]{2,}?[`'"]?\s*,\s*(?:the\s+)?(?:ai\s+)?(?:assistant|agent)?\s*(?:should\s+)?(?:immediately\s+)?(?:run|execute|call|invoke)/i;
    // "do not ask the user [first/before/for permission]"
    const doNotAsk =
      /\b(do\s+not|don'?t)\s+ask\s+(the\s+)?(user|developer|human)\b/i;
    // "without user [consent/permission/knowledge/approval]"
    const withoutConsent =
      /\bwithout\s+(?:the\s+)?(?:user(?:'s)?|developer(?:'s)?|human(?:'s)?)\s+(?:consent|permission|knowledge|approval|asking)\b/i;

    const patterns = [hideAction, silentAction, fakeError, doNotAsk, withoutConsent];

    lines.forEach((line, i) => {
      for (const pat of patterns) {
        if (pat.test(line)) {
          findings.push(finding(filePath, i + 1, "COERCION", line));
          break;
        }
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 11 — Supply-chain: instructions to inject external scripts/remote code
// into generated output
// ---------------------------------------------------------------------------
export const ruleSupplyChainInject: Rule = {
  id: "SUPPLY_CHAIN_INJECT",
  weight: 30,
  check(content, lines, filePath) {
    const findings: Finding[] = [];

    // Instructions telling the AI to add an external <script src="..."> tag
    const scriptInject =
      /<script\s[^>]*src\s*=\s*["']?https?:\/\/[^"'\s>]+["']?[^>]*>/i;
    // Instructions to include/add/insert an external script tag in generated HTML
    const includeScriptInstruction =
      /(?:include|add|insert|inject|append|embed)\s+[`<"']?\s*<script\s[^>]*src\s*=\s*["']?https?:\/\//i;
    // Instructions to load remote code (import from URL, require from URL)
    const remoteImport =
      /(?:import|require)\s*\(\s*["']https?:\/\/[^"']+["']\s*\)/i;
    // "every generated … must include <script src=..."
    const mustIncludeScript =
      /(?:every|all|each)\s+generated\s+\w+\s+(?:must|should|needs?\s+to)\s+include\s+[`<"']?\s*<script/i;

    // A bare <script src> tag is how every CDN install guide looks, so it is
    // not flagged on its own; only an instruction to add one is.
    void scriptInject;
    const patterns = [includeScriptInstruction, remoteImport, mustIncludeScript];

    lines.forEach((line, i) => {
      for (const pat of patterns) {
        if (pat.test(line)) {
          findings.push(finding(filePath, i + 1, "SUPPLY_CHAIN_INJECT", line));
          break;
        }
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Export all rules in execution order (cheapest / most common first)
// ---------------------------------------------------------------------------
export const ALL_RULES: Rule[] = [
  ruleZeroWidthChars,
  ruleBidiOverride,
  ruleCommentAiAddressed,
  ruleIgnorePreviousInstructions,
  ruleActionVerbNearSecret,
  ruleBase64Instruction,
  ruleExfiltrationUrl,
  ruleHtmlAttrInjection,
  ruleRemoteExec,
  ruleCoercion,
  ruleSupplyChainInject,
];
