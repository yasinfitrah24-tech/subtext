import type { NextApiRequest, NextApiResponse } from 'next';
import { judgeSnippets, watsonxConfigured, MAX_SNIPPETS, JudgeInput } from '../../lib/judge';

/**
 * GET  → { live: boolean, model?: string }  (is watsonx configured on the server?)
 * POST { snippets: [{ text, rule, file, line }] } → Granite Guardian verdicts
 *
 * Credentials stay on the server; nothing is stored or logged.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const live = watsonxConfigured();
    res.status(200).json({ live, model: live ? process.env.WATSONX_MODEL || 'ibm/granite-guardian-3-8b' : undefined });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body as { snippets?: unknown };
  if (!Array.isArray(body.snippets)) {
    res.status(400).json({ error: 'snippets must be an array' });
    return;
  }
  const snippets: JudgeInput[] = body.snippets
    .slice(0, MAX_SNIPPETS)
    .filter((s): s is JudgeInput => !!s && typeof (s as JudgeInput).text === 'string')
    .map((s) => ({
      text: String(s.text).slice(0, 2000),
      rule: String(s.rule ?? ''),
      file: String(s.file ?? '').slice(0, 300),
      line: Number(s.line) || 0,
    }));
  const out = await judgeSnippets(snippets);
  res.status(200).json(out);
}
