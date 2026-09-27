import type { NextApiRequest, NextApiResponse } from 'next';
import { scanText, computeScore, SCANNABLE_EXTENSIONS } from '../../lib/scanner';
import type { Finding } from '../../lib/types';

const MAX_FILES = 200;
const MAX_FILE_BYTES = 512 * 1024; // 512 KB per file
const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface RepoScanResponse {
  score: number;
  verdict: 'SAFE' | 'REVIEW' | 'BLOCK';
  findings: (Finding & { fileRelative: string })[];
  filesScanned: number;
  filesSkipped: number;
  repo: string;
  ref?: string;
  cached?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// In-memory cache keyed by canonical "<owner>/<repo>@<ref>/<basePath>"
// ---------------------------------------------------------------------------
interface CacheEntry {
  result: RepoScanResponse;
  expiresAt: number;
}
const scanCache = new Map<string, CacheEntry>();

function cacheKey(owner: string, repo: string, ref: string, basePath: string): string {
  return `${owner}/${repo}@${ref}/${basePath}`;
}

function getCached(key: string): RepoScanResponse | null {
  const entry = scanCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { scanCache.delete(key); return null; }
  return entry.result;
}

function setCached(key: string, result: RepoScanResponse): void {
  scanCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// GitHub URL parser
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GitHub tree listing — ONE API call, counts against rate limit quota
// ---------------------------------------------------------------------------
interface GithubTreeItem {
  path: string;
  type: string;
  size?: number;
  sha: string;
  url: string;
}

function githubApiHeaders(): Record<string, string> {
  return {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'subtext-scanner/1.0',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };
}

async function fetchGitHubTree(owner: string, repo: string, ref: string): Promise<GithubTreeItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  let resp: Response;
  try {
    resp = await fetch(url, { headers: githubApiHeaders() });
  } catch (err) {
    // Network-level failures (ECONNRESET, ETIMEDOUT, DNS failure, etc.)
    throw Object.assign(new Error('NETWORK_ERROR'), { isNetworkError: true });
  }
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    const status = resp.status;
    if (status === 403 || status === 429) {
      throw Object.assign(new Error('RATE_LIMIT'), { isRateLimit: true });
    }
    throw new Error(`GitHub API error ${status}: ${body.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { tree?: GithubTreeItem[]; truncated?: boolean };
  return data.tree ?? [];
}

// ---------------------------------------------------------------------------
// File content — fetched from raw.githubusercontent.com (NOT counted against
// the GitHub API rate limit for unauthenticated users)
// ---------------------------------------------------------------------------
async function fetchFileContent(owner: string, repo: string, path: string, ref: string, sizeHint?: number): Promise<string | null> {
  // Skip obviously oversized files early (size comes from tree listing)
  if (sizeHint !== undefined && sizeHint > MAX_FILE_BYTES) return null;

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;

  // Guard against large files that didn't have a size hint
  const contentLength = Number(resp.headers.get('content-length') ?? '0');
  if (contentLength > MAX_FILE_BYTES) return null;

  const text = await resp.text();
  if (text.length > MAX_FILE_BYTES) return null;
  return text;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse<RepoScanResponse>) {
  // Wrap the entire handler so that any unexpected throw still returns JSON.
  try {
    return await _handler(req, res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.status(500).json({
        score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0,
        repo: '',
        error: msg || 'Internal server error',
      });
    }
  }
}

async function _handler(req: NextApiRequest, res: NextApiResponse<RepoScanResponse>) {
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
  const key = cacheKey(owner, repo, ref, basePath);

  // Return cached result if available
  const cached = getCached(key);
  if (cached) {
    res.status(200).json({ ...cached, cached: true });
    return;
  }

  // Fetch file tree (one API call)
  let tree: GithubTreeItem[];
  try {
    tree = await fetchGitHubTree(owner, repo, ref);
  } catch (err) {
    const e = err as Error & { isRateLimit?: boolean; isNetworkError?: boolean };
    if (e.isRateLimit) {
      res.status(429).json({
        score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0,
        repo: repoLabel,
        error: 'RATE_LIMIT',
      });
      return;
    }
    if (e.isNetworkError) {
      res.status(502).json({
        score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0,
        repo: repoLabel,
        error: 'Could not reach GitHub from this server. Try again in a moment.',
      });
      return;
    }
    res.status(502).json({ score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0, repo: repoLabel, error: e.message });
    return;
  }

  // Filter to text files under basePath
  const candidates = tree.filter((item) => {
    if (item.type !== 'blob') return false;
    if (basePath && !item.path.startsWith(basePath + '/') && item.path !== basePath) return false;
    const ext = item.path.includes('.') ? '.' + item.path.split('.').pop()!.toLowerCase() : '';
    return SCANNABLE_EXTENSIONS.has(ext);
  });

  // Cap at MAX_FILES
  const toScan = candidates.slice(0, MAX_FILES);
  const skipped = candidates.length - toScan.length;

  const allFindings: (Finding & { fileRelative: string })[] = [];
  let filesScanned = 0;
  let filesSkipped = skipped;

  // Fetch and scan each file via raw.githubusercontent.com (no API quota)
  for (const item of toScan) {
    const content = await fetchFileContent(owner, repo, item.path, ref, item.size);
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

  const result: RepoScanResponse = {
    score,
    verdict,
    findings: allFindings,
    filesScanned,
    filesSkipped,
    repo: repoLabel,
    ref,
  };

  setCached(key, result);
  res.status(200).json(result);
}

// Increase body size limit for this route (not needed but explicit)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
