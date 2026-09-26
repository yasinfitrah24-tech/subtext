import type { NextApiRequest, NextApiResponse } from 'next';
import { sanitize, SanitizeChange } from '../../lib/sanitize';

/**
 * Returns a sanitized "clean copy" of one file.
 *
 * Body is either { content, filename } (pasted text) or
 * { repo: "owner/name", ref, path } (a file from a public GitHub repo, fetched
 * from raw.githubusercontent.com). Nothing is stored or logged.
 */

const MAX_BYTES = 512 * 1024;

interface CleanResponse {
  file: string;
  clean: string;
  changes: SanitizeChange[];
  remaining: number;
  error?: string;
}

function fail(res: NextApiResponse<CleanResponse>, status: number, error: string) {
  res.status(status).json({ file: '', clean: '', changes: [], remaining: 0, error });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CleanResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Method not allowed');
  }

  const body = req.body as { content?: unknown; filename?: unknown; repo?: unknown; ref?: unknown; path?: unknown };
  let content: string;
  let file: string;

  try {
    if (typeof body.content === 'string') {
      if (body.content.length > 200_000) return fail(res, 400, 'Content too large (max 200 KB)');
      content = body.content;
      file = typeof body.filename === 'string' && body.filename ? body.filename.slice(0, 200) : 'pasted-file.txt';
    } else if (typeof body.repo === 'string' && typeof body.path === 'string') {
      const repo = body.repo;
      const ref = typeof body.ref === 'string' && body.ref ? body.ref : 'HEAD';
      const filePath = body.path;
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return fail(res, 400, 'Invalid repo');
      if (!/^[\w./-]+$/.test(ref) || ref.includes('..')) return fail(res, 400, 'Invalid ref');
      if (filePath.includes('..') || filePath.startsWith('/')) return fail(res, 400, 'Invalid path');
      const url = `https://raw.githubusercontent.com/${repo}/${ref}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
      const resp = await fetch(url);
      if (!resp.ok) return fail(res, 502, `Could not fetch the file from GitHub (${resp.status})`);
      content = await resp.text();
      if (content.length > MAX_BYTES) return fail(res, 400, 'File too large (max 512 KB)');
      file = filePath;
    } else {
      return fail(res, 400, 'Send { content, filename } or { repo, ref, path }');
    }

    const { clean, changes, remaining } = sanitize(content, file);
    res.status(200).json({ file, clean, changes, remaining: remaining.length });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : 'Internal error');
  }
}
