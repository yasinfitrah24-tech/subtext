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

  // Collapse whitespace and split into sentences
  const sentences = beforeScore
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return {
      guardian_risk,
      reason: guardian_risk
        ? "Model identified prompt-injection risk."
        : "Model found no prompt-injection risk.",
    };
  }

  // Pick the most informative sentence: prefer one containing key signal words.
  // "Informative" is defined as containing domain-relevant terms that explain WHY
  // the decision was made (injection indicators, technique names, action words).
  const signalPattern =
    /\b(inject|injection|prompt|override|exfiltrat|malicious|jailbreak|manipulat|instruc|direct|command|execut|dangerou|harmf|suspicious|unauthori[sz]|coer|steal|bypass|escalat|token|secret|credential|env|exfil|hidden|disguise|encod|base64|zero.?width|bidi|curl|wget|script)\b/i;

  // Score each sentence: +2 for containing signal words, +1 for containing
  // the risk verdict ("yes"/"no"-adjacent language), prefer longer sentences
  // as tie-breaker (they tend to be more descriptive).
  let best = sentences[sentences.length - 1]; // fallback: last sentence
  let bestScore = -1;

  for (const s of sentences) {
    let score = 0;
    if (signalPattern.test(s)) score += 2;
    // Sentences mentioning the presence/absence of risk are informative
    if (/\b(does (not|contain)|contains?|present|found|identif|detect|indicat|shows?|suggests?)\b/i.test(s)) score += 1;
    // Prefer longer sentences (more context) as a tie-breaker
    score += Math.min(s.length / 200, 1);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  return { guardian_risk, reason: best };
}
