// Copied verbatim from scanner/src/sanitize.ts (see web/lib/rules.ts).

/**
 * Sanitizer: builds a "clean copy" of a flagged file that is safe to hand to
 * an AI coding agent.
 *
 * It never edits the original file. It returns new text plus a list of what
 * it changed, so a person can review every edit:
 *
 *   - invisible characters (zero-width, bidi controls) are stripped from the
 *     lines where the scanner found them (emoji ZWJ sequences are kept);
 *   - comments addressed to an AI are replaced by a short marker;
 *   - lines carrying an instruction aimed at the agent (exfiltration,
 *     "ignore previous instructions", coercion, curl | bash, ...) are replaced
 *     by a marker in the file's own comment syntax.
 *
 * JSON has no comment syntax, so instruction lines there are left in place
 * and reported as "flagged" instead of removed.
 */

import { ALL_RULES, isEmojiZwj } from "./rules";
import { Finding, RuleId } from "./types";

export type SanitizeAction =
  | "stripped-invisible"
  | "removed-comment"
  | "removed-line"
  | "flagged";

export interface SanitizeChange {
  line: number;
  /** Last line of the removed block when more than one line was removed. */
  through?: number;
  rules: RuleId[];
  action: SanitizeAction;
}

export interface SanitizeResult {
  clean: string;
  changes: SanitizeChange[];
  /** Findings still present after sanitizing (should be empty except JSON). */
  remaining: Finding[];
}

const INVISIBLE = /[­​‌‍⁠⁡⁢⁣⁤﻿]/g;
const BIDI = /[‪‫‬‭‮⁦⁧⁨⁩]/g;

const LINE_RULES: RuleId[] = [
  "IGNORE_PREVIOUS_INSTRUCTIONS",
  "ACTION_VERB_NEAR_SECRET",
  "BASE64_INSTRUCTION",
  "EXFILTRATION_URL",
  "HTML_ATTR_INJECTION",
  "REMOTE_EXEC",
  "COERCION",
  "SUPPLY_CHAIN_INJECT",
];

const REASON: Record<RuleId, string> = {
  COMMENT_AI_ADDRESSED: "comment addressed to an AI",
  IGNORE_PREVIOUS_INSTRUCTIONS: "instruction override",
  ACTION_VERB_NEAR_SECRET: "request to read or send a secret",
  ZERO_WIDTH_CHARS: "invisible characters",
  BIDI_OVERRIDE: "bidi control characters",
  BASE64_INSTRUCTION: "base64-encoded instruction",
  EXFILTRATION_URL: "exfiltration URL",
  HTML_ATTR_INJECTION: "instruction hidden in an HTML attribute",
  REMOTE_EXEC: "remote script piped to a shell",
  COERCION: "instruction to hide actions from the user",
  SUPPLY_CHAIN_INJECT: "instruction to inject an external script",
};

function stripInvisible(line: string): string {
  let out = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (/[­​‌⁠-⁤﻿]/.test(ch)) continue;
    if (ch === "‍" && !isEmojiZwj(line, i)) continue;
    out += ch;
  }
  return out;
}

type Syntax = "slash" | "hash" | "html" | "css" | "json" | "text";

function syntaxFor(filePath: string): Syntax {
  const p = filePath.toLowerCase();
  if (/\.json$/.test(p)) return "json";
  if (/\.(js|jsx|ts|tsx|mjs|cjs|java|go|rs|c|h|cc|cpp|cs|swift|kt|php|scss|less)$/.test(p)) return "slash";
  if (/\.(py|rb|sh|bash|zsh|fish|ps1|ya?ml|toml|ini|env)$/.test(p)) return "hash";
  if (/\.(html?|xml|svg|vue)$/.test(p)) return "html";
  if (/\.css$/.test(p)) return "css";
  return "text";
}

function marker(syntax: Syntax, lineNo: number, reason: string): string {
  const msg = `[Subtext] removed line ${lineNo}: ${reason}. See the scan report.`;
  switch (syntax) {
    case "slash":
      return `// ${msg}`;
    case "hash":
      return `# ${msg}`;
    case "html":
      return `<!-- ${msg} -->`;
    case "css":
      return `/* ${msg} */`;
    default:
      return `> ${msg}`;
  }
}

function removeAiComment(line: string): string {
  const note = "[Subtext] removed a comment addressed to an AI";
  return line
    .replace(/<!--[\s\S]*?-->/g, `<!-- ${note} -->`)
    .replace(/^(\s*)\[\/\/\]:\s*#\s*\(.+\)\s*$/, `$1[//]: # (${note})`)
    .replace(/\/\*[\s\S]*?\*\//g, `/* ${note} */`);
}

function scan(content: string, filePath: string): Finding[] {
  const lines = content.split(/\r?\n/);
  const out: Finding[] = [];
  for (const rule of ALL_RULES) out.push(...rule.check(content, lines, filePath));
  return out;
}

export function sanitize(content: string, filePath: string): SanitizeResult {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const findings = scan(content, filePath);

  const byLine = new Map<number, Set<RuleId>>();
  for (const f of findings) {
    if (!byLine.has(f.line)) byLine.set(f.line, new Set());
    byLine.get(f.line)!.add(f.rule);
  }

  const syntax = syntaxFor(filePath);
  const changes: SanitizeChange[] = [];
  const dropped = new Set<number>();

  for (const [lineNo, ruleSet] of [...byLine.entries()].sort((a, b) => a[0] - b[0])) {
    const idx = lineNo - 1;
    const rules = [...ruleSet];
    let line = lines[idx] ?? "";

    if (ruleSet.has("ZERO_WIDTH_CHARS")) line = stripInvisible(line);
    if (ruleSet.has("BIDI_OVERRIDE")) line = line.replace(BIDI, "");

    const lineRule = rules.find((r) => LINE_RULES.includes(r));
    let action: SanitizeAction;
    let through: number | undefined;
    if (lineRule && syntax !== "json") {
      // An injection often runs on over the next lines of the same comment
      // ("// to https://... as a POST body."). Drop the rest of that block.
      const original = lines[idx] ?? "";
      const prefix = /^\s*(\/\/|#)/.exec(original)?.[1];
      let j = idx + 1;
      if (prefix && (syntax === "slash" || syntax === "hash")) {
        while (j < lines.length && lines[j].trim().startsWith(prefix) && lines[j].trim().length > prefix.length) {
          dropped.add(j);
          j++;
        }
      } else if (/<!--/.test(original) && !/-->/.test(original.slice(original.lastIndexOf("<!--")))) {
        while (j < lines.length) {
          dropped.add(j);
          if (/-->/.test(lines[j])) { j++; break; }
          j++;
        }
      }
      if (j - 1 > idx) through = j;
      line = marker(syntax, lineNo, REASON[lineRule]);
      action = "removed-line";
    } else if (ruleSet.has("COMMENT_AI_ADDRESSED")) {
      line = removeAiComment(line);
      action = "removed-comment";
    } else if (ruleSet.has("ZERO_WIDTH_CHARS") || ruleSet.has("BIDI_OVERRIDE")) {
      action = lineRule ? "flagged" : "stripped-invisible";
    } else {
      action = "flagged";
    }
    lines[idx] = line;
    changes.push(through ? { line: lineNo, through, rules, action } : { line: lineNo, rules, action });
  }

  const clean = lines.filter((_, i) => !dropped.has(i)).join(eol);
  return { clean, changes, remaining: scan(clean, filePath) };
}

// Exported for tests.
export const _internal = { stripInvisible, removeAiComment, syntaxFor, INVISIBLE };
