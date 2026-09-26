/**
 * Types for the Granite Guardian judge step.
 */

/** Result of a single judge call on a snippet. */
export interface JudgeResult {
  provider: "ollama" | "watsonx" | "cached";
  model: string;
  /** true = model believes this snippet is a prompt-injection / jailbreak attempt */
  guardian_risk: boolean;
  /** One-sentence summary of the model's reasoning. */
  reason: string;
  latency_ms: number;
}

/** A flagged snippet passed to the judge. */
export interface Snippet {
  file: string;
  line: number;
  rule: string;
  text: string;
}
