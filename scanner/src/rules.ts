import { Finding, Rule } from "./types";

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
    const aiTerms = /\b(ai|llm|gpt|claude|gemini|assistant|system|chatgpt|model|inst|instruction|ignore|override|prompt)\b/i;

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
      if (blockComment && aiTerms.test(blockComment[1])) {
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
// ---------------------------------------------------------------------------
export const ruleActionVerbNearSecret: Rule = {
  id: "ACTION_VERB_NEAR_SECRET",
  weight: 35,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    const actionVerb =
      /\b(read|send|post|upload|run|execute|delete|fetch|exfiltrate|transmit|forward|export|leak|steal|dump|emit|call)\b/i;
    const secretKeyword =
      /\b(\.env|api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|auth[_\s-]?token|password|passwd|credentials?|private[_\s-]?key|bearer|jwt|ssh[_\s-]?key|aws[_\s-]?secret|gh[_\s-]?token|pat\b|token)\b/i;

    // Check a window of ±3 lines around each action-verb line
    lines.forEach((line, i) => {
      if (!actionVerb.test(line)) return;
      const windowStart = Math.max(0, i - 3);
      const windowEnd = Math.min(lines.length - 1, i + 3);
      const window = lines.slice(windowStart, windowEnd + 1).join(" ");
      if (secretKeyword.test(window)) {
        findings.push(
          finding(filePath, i + 1, "ACTION_VERB_NEAR_SECRET", line)
        );
      }
    });
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Rule 4 — Zero-width and invisible Unicode characters
// ---------------------------------------------------------------------------
export const ruleZeroWidthChars: Rule = {
  id: "ZERO_WIDTH_CHARS",
  weight: 30,
  check(content, lines, filePath) {
    const findings: Finding[] = [];
    // Zero-width space, non-joiner, joiner, word-joiner, soft-hyphen,
    // invisible separator, zero-width no-break space (BOM inside text)
    const zwPattern =
      /[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/;

    lines.forEach((line, i) => {
      if (zwPattern.test(line)) {
        // Show escaped representation so hidden chars are visible in output
        const escaped = line.replace(
          /[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/g,
          (c) => `<U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}>`
        );
        findings.push(
          finding(filePath, i + 1, "ZERO_WIDTH_CHARS", escaped)
        );
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
    const b64Pattern = /(?<![A-Za-z0-9+/=])([A-Za-z0-9+/]{40,}={0,2})(?![A-Za-z0-9+/=])/g;
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
      /[?&](token|key|secret|auth|api[_-]?key|password|user|email|id|session|code|data|content|text|msg|payload|prompt|q)=/i;
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
];
