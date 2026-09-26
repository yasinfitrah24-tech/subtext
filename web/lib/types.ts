/**
 * Shared types for the web scanner (mirrors scanner/src/types.ts).
 */

export type RuleId =
  | 'COMMENT_AI_ADDRESSED'
  | 'IGNORE_PREVIOUS_INSTRUCTIONS'
  | 'ACTION_VERB_NEAR_SECRET'
  | 'ZERO_WIDTH_CHARS'
  | 'BIDI_OVERRIDE'
  | 'BASE64_INSTRUCTION'
  | 'EXFILTRATION_URL'
  | 'HTML_ATTR_INJECTION'
  | 'REMOTE_EXEC'
  | 'COERCION'
  | 'SUPPLY_CHAIN_INJECT';

export interface Finding {
  file: string;
  line: number;
  rule: RuleId;
  snippet: string;
}

export interface Rule {
  id: RuleId;
  weight: number;
  check(content: string, lines: string[], filePath: string): Finding[];
}
