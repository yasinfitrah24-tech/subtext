/**
 * Cached fallback provider for Granite Guardian.
 *
 * Used when no real provider is reachable. Returns labeled example responses
 * so downstream consumers can distinguish real results from stubs.
 */

import { JudgeResult, Snippet } from "./types";

const CACHED_MODEL = "granite-guardian-cached-example";

/**
 * Heuristic: if the snippet text contains common injection keywords, mark as
 * risky. This is NOT a real classifier — it mirrors cached example behaviour.
 */
function looksRisky(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /ignore (previous|prior|all) (instructions?|rules?|context)/i.test(lower) ||
    /you are now/i.test(lower) ||
    /act as (a )?dan/i.test(lower) ||
    /jailbreak/i.test(lower) ||
    /<!--\s*(ai|gpt|claude|llm)\s*:/i.test(lower) ||
    /system\s*prompt/i.test(lower)
  );
}

export async function judgeWithCache(snippet: Snippet): Promise<JudgeResult> {
  const guardian_risk = looksRisky(snippet.text);
  return {
    provider: "cached",
    model: CACHED_MODEL,
    guardian_risk,
    reason: guardian_risk
      ? "Cached example: snippet matches known prompt-injection keyword pattern."
      : "Cached example: no prompt-injection keyword pattern detected.",
    latency_ms: 0,
  };
}
