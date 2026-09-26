import type { NextApiRequest, NextApiResponse } from 'next';
import { scanText, computeScore } from '../../lib/scanner';
import type { Finding } from '../../lib/types';

interface ScanResponse {
  score: number;
  verdict: 'SAFE' | 'REVIEW' | 'BLOCK';
  findings: Finding[];
  error?: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ScanResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ score: 0, verdict: 'SAFE', findings: [], error: 'Method not allowed' });
    return;
  }

  const { content, filename } = req.body as { content?: string; filename?: string };

  if (typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ score: 0, verdict: 'SAFE', findings: [], error: 'content is required' });
    return;
  }

  if (content.length > 200_000) {
    res.status(400).json({ score: 0, verdict: 'SAFE', findings: [], error: 'Content too large (max 200 KB)' });
    return;
  }

  const filePath = filename && typeof filename === 'string' ? filename.slice(0, 200) : 'pasted-file.txt';
  const findings = scanText(content, filePath);
  const { score, verdict } = computeScore(findings);

  // Never store or log the content
  res.status(200).json({ score, verdict, findings });
}
