/**
 * Scanner core logic shared between the CLI and the web demo.
 * This file contains ONLY the pure functions that work without Node.js `fs`.
 * It re-exports the rule engine and compute functions.
 *
 * Reused from /scanner/src — do NOT duplicate the rule logic.
 */

import { Finding, Rule } from './types';

export type { Finding, Rule };

// ---------------------------------------------------------------------------
// Helper: test whether a U+200D (ZWJ) in `line` is sandwiched between emoji
// ---------------------------------------------------------------------------
function isEmojiZwj(line: string, zwjIndex: number): boolean {
  const codePoints = [...line];

  function isEmojiCp(ch: string | undefined): boolean {
    if (!ch) return false;
    const cp = ch.codePointAt(0)!;
    if (cp === 0xFE0F || cp === 0xFE0E) return true;
    if (cp >= 0x1F3FB && cp <= 0x1F3FF) return true;
    if (cp >= 0x1F000 && cp <= 0x1FFFF) return true;
    if (cp >= 0x2600 && cp <= 0x27BF) return true;
    if (cp >= 0x1F900 && cp <= 0x1F9FF) return true;
    if (cp >= 0x1FA00 && cp <= 0x1FAFF) return true;
    if (cp === 0x2640 || cp === 0x2642 || cp === 0x2695 || cp === 0x2696 || cp === 0x2708) return true;
    return false;
  }

  let utf16Offset = 0;
  for (let cpIdx = 0; cpIdx < codePoints.length; cpIdx++) {
    if (utf16Offset === zwjIndex) {
      return isEmojiCp(codePoints[cpIdx - 1]) && isEmojiCp(codePoints[cpIdx + 1]);
    }
    utf16Offset += codePoints[cpIdx].length;
  }
  return false;
}

function finding(filePath: string, lineNumber: number, rule: string, raw: string): Finding {
  const snippet = raw.length > 120 ? raw.slice(0, 117) + '...' : raw;
  return { file: filePath, line: lineNumber, rule: rule as Finding['rule'], snippet: snippet.trim() };
}

// All rules (ported from scanner/src/rules.ts — same logic, no fs dependency)
const RULES: Rule[] = [
  // Rule 1: Zero-width chars
  {
    id: 'ZERO_WIDTH_CHARS', weight: 30,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const zwPattern = /[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/g;
      lines.forEach((line, i) => {
        if (!/[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/.test(line)) return;
        let hasRealHit = false;
        let m: RegExpExecArray | null;
        zwPattern.lastIndex = 0;
        while ((m = zwPattern.exec(line)) !== null) {
          const cp = m[0].codePointAt(0)!;
          if (cp === 0x200D && isEmojiZwj(line, m.index)) continue;
          hasRealHit = true; break;
        }
        if (hasRealHit) {
          const escaped = line.replace(/[\u00AD\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/g, (c, offset) => {
            const cp2 = c.codePointAt(0)!;
            if (cp2 === 0x200D && isEmojiZwj(line, offset)) return c;
            return `<U+${cp2.toString(16).toUpperCase().padStart(4, '0')}>`;
          });
          findings.push(finding(filePath, i + 1, 'ZERO_WIDTH_CHARS', escaped));
        }
      });
      return findings;
    },
  },
  // Rule 2: Bidi override
  {
    id: 'BIDI_OVERRIDE', weight: 30,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const bidiPattern = /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/;
      lines.forEach((line, i) => {
        if (bidiPattern.test(line)) {
          const escaped = line.replace(/[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g, (c) => `<U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}>`);
          findings.push(finding(filePath, i + 1, 'BIDI_OVERRIDE', escaped));
        }
      });
      return findings;
    },
  },
  // Rule 3: Comment AI addressed
  {
    id: 'COMMENT_AI_ADDRESSED', weight: 20,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const aiTerms = /\b(ai|llm|gpt|claude|gemini|assistant|system|chatgpt|model|inst|instruction|ignore|override|prompt)\b/i;
      lines.forEach((line, i) => {
        const htmlComment = /<!--([\s\S]*?)-->/.exec(line);
        if (htmlComment && aiTerms.test(htmlComment[1])) { findings.push(finding(filePath, i + 1, 'COMMENT_AI_ADDRESSED', line)); return; }
        const mdComment = /^\[\/\/\]:\s*#\s*\((.+)\)/.exec(line.trim());
        if (mdComment && aiTerms.test(mdComment[1])) { findings.push(finding(filePath, i + 1, 'COMMENT_AI_ADDRESSED', line)); return; }
        const blockComment = /\/\*([\s\S]*?)\*\//.exec(line);
        if (blockComment && aiTerms.test(blockComment[1])) { findings.push(finding(filePath, i + 1, 'COMMENT_AI_ADDRESSED', line)); }
      });
      return findings;
    },
  },
  // Rule 4: Ignore previous instructions
  {
    id: 'IGNORE_PREVIOUS_INSTRUCTIONS', weight: 40,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const overridePattern = /ignore\s+(all\s+)?(previous|prior|above|earlier|former)\s+(instructions?|prompts?|context|rules?|directives?)|disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)|forget\s+(everything|all)\s+(you\s+)?(know|were\s+told|above)|new\s+instructions?:|system\s*:\s*you\s+(are|must|should|will)|you\s+are\s+now\s+(a|an)\s+\w+|act\s+as\s+(a|an)\s+(unrestricted|jailbreak|DAN|uncensored)|do\s+anything\s+now|dan\s+mode|jailbreak\s+mode|\[\s*system\s*\]|\[INST\]|<\|system\|>|<\|im_start\|>/i;
      lines.forEach((line, i) => { if (overridePattern.test(line)) findings.push(finding(filePath, i + 1, 'IGNORE_PREVIOUS_INSTRUCTIONS', line)); });
      return findings;
    },
  },
  // Rule 5: Action verb near secret
  {
    id: 'ACTION_VERB_NEAR_SECRET', weight: 35,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const actionVerb = /\b(read|send|post|upload|run|execute|delete|fetch|exfiltrate|transmit|forward|export|leak|steal|dump|emit|call)\b/i;
      const secretKeyword = /(\.env\b|\b(?:api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|auth[_\s-]?token|password|passwd|credentials?|private[_\s-]?key|bearer|jwt|ssh[_\s-]?key|aws[_\s-]?secret|gh[_\s-]?token|pat|token)\b)/i;
      lines.forEach((line, i) => {
        if (!actionVerb.test(line)) return;
        const windowStart = Math.max(0, i - 3);
        const windowEnd = Math.min(lines.length - 1, i + 3);
        const window = lines.slice(windowStart, windowEnd + 1).join(' ');
        if (secretKeyword.test(window)) findings.push(finding(filePath, i + 1, 'ACTION_VERB_NEAR_SECRET', line));
      });
      return findings;
    },
  },
  // Rule 6: Base64 instruction
  {
    id: 'BASE64_INSTRUCTION', weight: 35,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const b64Pattern = /(?<![A-Za-z0-9+/])([A-Za-z0-9+/]{40,}={0,2})(?![A-Za-z0-9+/])/g;
      const instructionHints = /ignore|system\s*:|you\s+are|act\s+as|instruction|prompt|override|disregard|forget|jailbreak|exec|eval|fetch|token|api[_\s]key|password/i;
      lines.forEach((line, i) => {
        let match: RegExpExecArray | null;
        b64Pattern.lastIndex = 0;
        while ((match = b64Pattern.exec(line)) !== null) {
          try {
            const decoded = Buffer.from(match[1], 'base64').toString('utf8');
            if (/^[\x20-\x7E\r\n\t]{10,}$/.test(decoded) && instructionHints.test(decoded)) {
              findings.push(finding(filePath, i + 1, 'BASE64_INSTRUCTION', `${match[1].slice(0, 40)}… → "${decoded.slice(0, 80)}"`));
            }
          } catch { /* skip */ }
        }
      });
      return findings;
    },
  },
  // Rule 7: Exfiltration URL
  {
    id: 'EXFILTRATION_URL', weight: 25,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const mdUrlPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
      const sensitiveParam = /[?&](token|key|secret|auth|api[_-]?key|password|user|email|id|session|code|data|content|text|msg|payload|prompt|q)=/i;
      const canaryHost = /\b(burpcollaborator\.net|interact\.sh|canarytokens\.org|webhook\.site|requestbin\.|ngrok\.io|pipedream\.net|oast\.|hookbin\.com)/i;
      lines.forEach((line, i) => {
        let match: RegExpExecArray | null;
        mdUrlPattern.lastIndex = 0;
        while ((match = mdUrlPattern.exec(line)) !== null) {
          const url = match[1];
          if (sensitiveParam.test(url) || canaryHost.test(url)) findings.push(finding(filePath, i + 1, 'EXFILTRATION_URL', line));
        }
      });
      return findings;
    },
  },
  // Rule 8: HTML attr injection
  {
    id: 'HTML_ATTR_INJECTION', weight: 25,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const attrPattern = /(?:alt|title|aria-label|data-[a-z-]+|placeholder|value|name|id)\s*=\s*["']([^"']{20,})["']/gi;
      const instructionHints = /ignore|system:|you\s+are|act\s+as|instruction|prompt|override|disregard|forget|jailbreak|new\s+task|execute|your\s+(new\s+)?role/i;
      lines.forEach((line, i) => {
        let match: RegExpExecArray | null;
        attrPattern.lastIndex = 0;
        while ((match = attrPattern.exec(line)) !== null) {
          if (instructionHints.test(match[1])) findings.push(finding(filePath, i + 1, 'HTML_ATTR_INJECTION', line));
        }
      });
      return findings;
    },
  },
  // Rule 9: Remote exec
  {
    id: 'REMOTE_EXEC', weight: 25,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const patterns = [
        /\b(curl|wget)\b[^|\n]*\|\s*(ba)?sh\b/i,
        /\b(IEX|Invoke-Expression)\s*[\(\s]|\.DownloadString\s*\(/i,
        /\b(exec|eval|compile)\s*\(\s*(?:[\w.]+\.(?:get|fetch|urlopen|read|text|content|decode)\s*[\(\[]|base64\.b64decode\s*\()/i,
        /\bbash\s+-c\s+["'`]\s*\$\(\s*dig\b/i,
        /\b(?:ba)?sh\s+-c\s+["'`][^"'`]*\$\(\s*(?:curl|wget|dig|nslookup)/i,
      ];
      lines.forEach((line, i) => {
        for (const pat of patterns) {
          if (pat.test(line)) { findings.push(finding(filePath, i + 1, 'REMOTE_EXEC', line)); break; }
        }
      });
      return findings;
    },
  },
  // Rule 10: Coercion
  {
    id: 'COERCION', weight: 30,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const patterns = [
        /\b(do\s+not|don'?t)\s+(tell|inform|notify|mention|show|warn|ask|let)\s+(the\s+)?(user|developer|human|operator)\b/i,
        /\bsilently\s+(?:add|insert|inject|include|modify|delete|remove|run|execute|call|append|update|change)\b/i,
        /(?:if\s+you\s+see|when\s+you\s+(?:see|encounter|get))\s+[`'"]?[\w\s:.-]{2,}?[`'"]?\s*,\s*(?:the\s+)?(?:ai\s+)?(?:assistant|agent)?\s*(?:should\s+)?(?:immediately\s+)?(?:run|execute|call|invoke)/i,
        /\b(do\s+not|don'?t)\s+ask\s+(the\s+)?(user|developer|human)\b/i,
        /\bwithout\s+(?:the\s+)?(?:user(?:'s)?|developer(?:'s)?|human(?:'s)?)\s+(?:consent|permission|knowledge|approval|asking)\b/i,
      ];
      lines.forEach((line, i) => {
        for (const pat of patterns) {
          if (pat.test(line)) { findings.push(finding(filePath, i + 1, 'COERCION', line)); break; }
        }
      });
      return findings;
    },
  },
  // Rule 11: Supply chain inject
  {
    id: 'SUPPLY_CHAIN_INJECT', weight: 30,
    check(content, lines, filePath) {
      const findings: Finding[] = [];
      const patterns = [
        /<script\s[^>]*src\s*=\s*["']?https?:\/\/[^"'\s>]+["']?[^>]*>/i,
        /(?:include|add|insert|inject|append|embed)\s+[`<"']?\s*<script\s[^>]*src\s*=\s*["']?https?:\/\//i,
        /(?:import|require)\s*\(\s*["']https?:\/\/[^"']+["']\s*\)/i,
        /(?:every|all|each)\s+generated\s+\w+\s+(?:must|should|needs?\s+to)\s+include\s+[`<"']?\s*<script/i,
      ];
      lines.forEach((line, i) => {
        for (const pat of patterns) {
          if (pat.test(line)) { findings.push(finding(filePath, i + 1, 'SUPPLY_CHAIN_INJECT', line)); break; }
        }
      });
      return findings;
    },
  },
];

export function scanText(content: string, filePath: string): Finding[] {
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];
  for (const rule of RULES) {
    findings.push(...rule.check(content, lines, filePath));
  }
  return findings;
}

export function computeScore(allFindings: Finding[]): { score: number; verdict: 'SAFE' | 'REVIEW' | 'BLOCK' } {
  if (allFindings.length === 0) return { score: 0, verdict: 'SAFE' };

  const seen = new Set<string>();
  let rawScore = 0;
  for (const f of allFindings) {
    const key = `${f.rule}::${f.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      const rule = RULES.find((r) => r.id === f.rule);
      rawScore += rule ? rule.weight : 10;
    }
  }
  const score = Math.min(100, rawScore);
  const verdict = score >= 60 ? 'BLOCK' : score >= 20 ? 'REVIEW' : 'SAFE';
  return { score, verdict };
}

export const SCANNABLE_EXTENSIONS = new Set([
  '.md', '.txt', '.html', '.htm', '.xml', '.svg',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.php', '.java', '.go', '.rs',
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.css', '.scss', '.sass', '.less',
  '.csv', '.rst', '.tex',
  '.cursorrules', '.windsurfrules', '.mdc',
]);
