/**
 * Scanner core for the web demo. Pure functions, no Node.js `fs`.
 * The rules live in ./rules.ts, a verbatim copy of scanner/src/rules.ts,
 * so the CLI and the site always agree.
 */

import { Finding, Rule } from './types';
import { ALL_RULES } from './rules';

export type { Finding, Rule };

export function scanText(content: string, filePath: string): Finding[] {
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];
  for (const rule of ALL_RULES) {
    findings.push(...rule.check(content, lines, filePath));
  }
  return findings;
}

/**
 * Score each file on its own (each rule counts once per file) and take the
 * worst file. Summing across files would let a large, healthy repo reach
 * BLOCK from many unrelated weak hits. Same logic as scanner/src/scanner.ts.
 */
export function computeScore(allFindings: Finding[]): { score: number; verdict: 'SAFE' | 'REVIEW' | 'BLOCK' } {
  if (allFindings.length === 0) return { score: 0, verdict: 'SAFE' };

  const perFile = new Map<string, Set<string>>();
  for (const f of allFindings) {
    if (!perFile.has(f.file)) perFile.set(f.file, new Set());
    perFile.get(f.file)!.add(f.rule);
  }
  let rawScore = 0;
  for (const rules of perFile.values()) {
    let fileScore = 0;
    for (const id of rules) {
      const rule = ALL_RULES.find((r) => r.id === id);
      fileScore += rule ? rule.weight : 10;
    }
    rawScore = Math.max(rawScore, fileScore);
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
