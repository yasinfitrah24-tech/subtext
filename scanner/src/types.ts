/**
 * Shared types for the prompt-injection scanner.
 */

export interface Finding {
  file: string;
  line: number;
  rule: RuleId;
  snippet: string;
}

export type Verdict = "SAFE" | "REVIEW" | "BLOCK";

export interface ScanResult {
  score: number;       // 0–100
  verdict: Verdict;
  findings: Finding[];
}

export type RuleId =
  | "COMMENT_AI_ADDRESSED"
  | "IGNORE_PREVIOUS_INSTRUCTIONS"
  | "ACTION_VERB_NEAR_SECRET"
  | "ZERO_WIDTH_CHARS"
  | "BIDI_OVERRIDE"
  | "BASE64_INSTRUCTION"
  | "EXFILTRATION_URL"
  | "HTML_ATTR_INJECTION"
  | "REMOTE_EXEC"
  | "COERCION"
  | "SUPPLY_CHAIN_INJECT";

/**
 * A rule returns every Finding it discovers in the given file content.
 * `filePath` is only used to populate Finding.file.
 * `lines` is the pre-split array of lines (1-indexed by position+1).
 */
export interface Rule {
  id: RuleId;
  /** Weight applied to the score per finding (capped at 100 total). */
  weight: number;
  check(content: string, lines: string[], filePath: string): Finding[];
}
