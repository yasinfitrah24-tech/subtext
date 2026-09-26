/**
 * Parse the granite4.1-guardian response format.
 *
 * The model writes its reasoning first, then ends with one of:
 *   <score> yes </score>
 *   <score> no </score>
 *
 * Returns:
 *   { guardian_risk, reason }
 */
export function parseGuardianResponse(raw: string): {
  guardian_risk: boolean;
  reason: string;
} {
  // Extract score tag (case-insensitive, whitespace-tolerant)
  const scoreMatch = raw.match(/<score>\s*(yes|no)\s*<\/score>/i);
  const guardian_risk = scoreMatch
    ? scoreMatch[1].toLowerCase() === "yes"
    : false;

  // Build a one-sentence reason from the text before the score tag
  const beforeScore = scoreMatch
    ? raw.slice(0, raw.search(/<score>/i))
    : raw;

  // Collapse whitespace and take the last non-empty sentence
  const sentences = beforeScore
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const reason =
    sentences[sentences.length - 1] ??
    (guardian_risk
      ? "Model identified prompt-injection risk."
      : "Model found no prompt-injection risk.");

  return { guardian_risk, reason };
}
