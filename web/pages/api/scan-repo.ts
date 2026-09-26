import type { NextApiRequest, NextApiResponse } from 'next';
import { scanText, computeScore, SCANNABLE_EXTENSIONS } from '../../lib/scanner';
import type { Finding } from '../../lib/types';

const MAX_FILES = 200;
const MAX_FILE_BYTES = 512 * 1024; // 512 KB per file
const GITHUB_API_BASE = 'https://api.github.com';

interface RepoScanResponse {
  score: number;
  verdict: 'SAFE' | 'REVIEW' | 'BLOCK';
  findings: (Finding & { fileRelative: string })[];
  filesScanned: number;
  filesSkipped: number;
  repo: string;
  error?: string;
}

/**
 * Parse a GitHub URL (repo or subfolder) and return { owner, repo, path, ref }.
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch/path/to/folder
 *   https://github.com/owner/repo/blob/branch/path/to/file
 */
function parseGitHubUrl(url: string): { owner: string; repo: string; path: string; ref: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    let ref = 'HEAD';
    let path = '';
    if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
      ref = parts[3];
      path = parts.slice(4).join('/');
    }
    return { owner, repo, path, ref };
  } catch {
    return null;
  }
}

interface GithubTreeItem {
  path: string;
  type: string;
  size?: number;
  sha: string;
  url: string;
}

async function fetchGitHubTree(owner: string, repo: string, ref: string): Promise<GithubTreeItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'subtext-scanner/1.0',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`GitHub API error ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { tree?: GithubTreeItem[]; truncated?: boolean };
  return data.tree ?? [];
}

async function fetchFileContent(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'subtext-scanner/1.0',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { content?: string; encoding?: string; size?: number };
  if (!data.content || data.encoding !== 'base64') return null;
  if ((data.size ?? 0) > MAX_FILE_BYTES) return null;
  // Decode base64 content (GitHub API always returns base64)
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<RepoScanResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0, repo: '', error: 'Method not allowed' });
    return;
  }

  const { repoUrl } = req.body as { repoUrl?: string };

  if (typeof repoUrl !== 'string' || repoUrl.trim().length === 0) {
    res.status(400).json({ score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0, repo: '', error: 'repoUrl is required' });
    return;
  }

  const parsed = parseGitHubUrl(repoUrl.trim());
  if (!parsed) {
    res.status(400).json({ score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0, repo: repoUrl, error: 'Invalid GitHub URL. Expected: https://github.com/owner/repo' });
    return;
  }

  const { owner, repo, path: basePath, ref } = parsed;
  const repoLabel = `${owner}/${repo}`;

  let tree: GithubTreeItem[];
  try {
    tree = await fetchGitHubTree(owner, repo, ref);
  } catch (err) {
    const msg = (err as Error).message;
    res.status(502).json({ score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0, repo: repoLabel, error: msg });
    return;
  }

  // Filter to text files under basePath
  const candidates = tree.filter((item) => {
    if (item.type !== 'blob') return false;
    if (basePath && !item.path.startsWith(basePath)) return false;
    const ext = item.path.includes('.') ? '.' + item.path.split('.').pop()!.toLowerCase() : '';
    return SCANNABLE_EXTENSIONS.has(ext);
  });

  // Cap at MAX_FILES
  const toScan = candidates.slice(0, MAX_FILES);
  const skipped = candidates.length - toScan.length;

  const allFindings: (Finding & { fileRelative: string })[] = [];
  let filesScanned = 0;
  let filesSkipped = skipped;

  // Fetch and scan each file (sequential to avoid rate limits)
  for (const item of toScan) {
    const content = await fetchFileContent(owner, repo, item.path, ref);
    if (content === null) { filesSkipped++; continue; }
    filesScanned++;
    const relPath = basePath ? item.path.slice(basePath.length).replace(/^\//, '') : item.path;
    const displayPath = `${repoLabel}/${item.path}`;
    const findings = scanText(content, displayPath);
    for (const f of findings) {
      allFindings.push({ ...f, fileRelative: relPath || item.path });
    }
    // Never store content — only findings
  }

  const { score, verdict } = computeScore(allFindings);

  res.status(200).json({
    score,
    verdict,
    findings: allFindings,
    filesScanned,
    filesSkipped,
    repo: repoLabel,
  });
}

// Increase body size limit for this route (not needed but explicit)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
