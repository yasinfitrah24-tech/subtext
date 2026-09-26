# Only touch /scanner/src/rules.ts, its tests, /web/pages/api/scan-repo.ts and the Demo findings UI in /web.
1. False positives: rule ACTION_VERB_NEAR_SECRET flags normal install steps like "Run `npm install`" and "Run `npm test` to verify" just because they are near a malicious line. Require the action verb and the secret reference to be in the same line/sentence, and do not flag plain command instructions that mention no secret. Add unit tests for these benign lines.
2. UI: when several rules hit the same file and line, show one finding card with multiple rule badges instead of duplicates.
3. Make /api/scan-repo always return JSON errors (never an HTML 500 page). On network errors like ECONNRESET or timeouts, return { error: "Could not reach GitHub from this server. Try again in a moment." } and show that message in the UI.
4. Run npm.cmd test in /scanner and re-run the evaluation; confirm detection rate and false positive rate did not get worse, and update README numbers if they changed.
Do not start the dev server.

---

**Status:** active  **Date:** 2026-09-26

---

### 👤 User

Only touch /scanner/src/rules.ts, its tests, /web/pages/api/scan-repo.ts and the Demo findings UI in /web.
1. False positives: rule ACTION_VERB_NEAR_SECRET flags normal install steps like "Run `npm install`" and "Run `npm test` to verify" just because they are near a malicious line. Require the action verb and the secret reference to be in the same line/sentence, and do not flag plain command instructions that mention no secret. Add unit tests for these benign lines.
2. UI: when several rules hit the same file and line, show one finding card with multiple rule badges instead of duplicates.
3. Make /api/scan-repo always return JSON errors (never an HTML 500 page). On network errors like ECONNRESET or timeouts, return { error: "Could not reach GitHub from this server. Try again in a moment." } and show that message in the UI.
4. Run npm.cmd test in /scanner and re-run the evaluation; confirm detection rate and false positive rate did not get worse, and update README numbers if they changed.
Do not start the dev server.

---

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[-] Investigate current codebase structure
[ ] Fix ACTION_VERB_NEAR_SECRET false positives (same line/sentence requirement)
[ ] Add unit tests for benign lines
[ ] UI: deduplicate finding cards by file+line, show multiple rule badges
[ ] Make /api/scan-repo return JSON errors always
[ ] Show network error message in Demo UI
[ ] Run npm test in /scanner and verify detection/FP rates
[ ] Update README numbers if changed


### 🤖 Assistant

> 🔧 called: list_files, list_files, list_files



> 🔧 **list_files** — .

> 🔧 **list_files** — scanner/src

> 🔧 **list_files** — web/pages

### 🤖 Assistant

> 🔧 called: read_file, read_file, list_files



> 🔧 **list_files** — scanner/src/__tests__

> 🔧 **read_file** — scanner/src/rules.ts

> 🔧 **read_file** — web/pages/api/scan-repo.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — web/pages/demo.tsx

> 🔧 **read_file** — scanner/src/__tests__/rules.test.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file

Now let me read the existing tests for Rule 3 and the README for current numbers:

> 🔧 **read_file** — scanner/src/__tests__/rules.test.ts

> 🔧 **read_file** — README.md

### 🤖 Assistant

> 🔧 called: list_files, read_file

Now I have a clear picture. Let me also look at the eval directory to understand how to re-run evaluations:

> 🔧 **list_files** — eval

> 🔧 **read_file** — scanner/src/__tests__/rules.test.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file

Now I understand the issue with `'fetch' near 'token' in a nearby line` test — that's an existing test that passes with the current window-based logic, but the new requirement says the action verb and secret must be on the **same line/sentence**. That test (`fetch the data\naccess_token = process.env.TOKEN`) puts the verb on line 1 and the secret on line 2 — it currently passes but will need to change since we're requiring same-line.

Let me also look at the existing test for "fetch near token" more carefully and check the web styles:

> 🔧 **read_file** — web/styles/Demo.module.css

> 🔧 **read_file** — eval/evaluate.ts

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Investigate current codebase structure
[-] Fix ACTION_VERB_NEAR_SECRET false positives (same line/sentence requirement)
[ ] Add unit tests for benign lines
[ ] UI: deduplicate finding cards by file+line, show multiple rule badges
[ ] Make /api/scan-repo return JSON errors always
[ ] Show network error message in Demo UI
[ ] Run npm test in /scanner and verify detection/FP rates
[ ] Update README numbers if changed


### 🤖 Assistant

> 🔧 called: apply_diff

Now I have everything I need. Let me implement all the changes:

**1. Fix `ruleActionVerbNearSecret` in `rules.ts`** — require same line/sentence:

> 🔧 **apply_diff** — scanner/src/rules.ts

### 🤖 Assistant

> 🔧 called: apply_diff

Now update the unit tests — fix the broken cross-line test and add benign tests:

> 🔧 **apply_diff** — scanner/src/__tests__/rules.test.ts

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Investigate current codebase structure
[x] Fix ACTION_VERB_NEAR_SECRET false positives (same line/sentence requirement)
[x] Add unit tests for benign lines
[-] UI: deduplicate finding cards by file+line, show multiple rule badges
[ ] Make /api/scan-repo return JSON errors always
[ ] Show network error message in Demo UI
[ ] Run npm test in /scanner and verify detection/FP rates
[ ] Update README numbers if changed


### 🤖 Assistant

> 🔧 called: apply_diff

Now update [`demo.tsx`](web/pages/demo.tsx) for the UI deduplication and network error handling:

> 🔧 **apply_diff** — web/pages/demo.tsx

### 🤖 Assistant

> 🔧 called: apply_diff

Now update [`scan-repo.ts`](web/pages/api/scan-repo.ts) to always return JSON errors, handling network errors:

> 🔧 **apply_diff** — <<<<<<< SEARCH
:start_line:87
-------
async function fetchGitHubTree(owner: string, repo: string, ref: string): Promise<GithubTreeItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const resp = await fetch(url, { headers: githubApiHeaders() });
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
=======
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
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:158
-------
  // Fetch file tree (one API call)
  let tree: GithubTreeItem[];
  try {
    tree = await fetchGitHubTree(owner, repo, ref);
  } catch (err) {
    const e = err as Error & { isRateLimit?: boolean };
    if (e.isRateLimit) {
      res.status(429).json({
        score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0,
        repo: repoLabel,
        error: 'RATE_LIMIT',
      });
      return;
    }
    res.status(502).json({ score: 0, verdict: 'SAFE', findings: [], filesScanned: 0, filesSkipped: 0, repo: repoLabel, error: (e).message });
    return;
  }
=======
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
>>>>>>> REPLACE


### 🤖 Assistant

> 🔧 called: apply_diff

Now I need to add a global unhandled-error wrapper to `scan-repo.ts` so that no unexpected exception produces an HTML 500. Also update the demo UI to handle the network error message:

> 🔧 **apply_diff** — <<<<<<< SEARCH
:start_line:126
-------
// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse<RepoScanResponse>) {
  if (req.method !== 'POST') {
=======
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
>>>>>>> REPLACE


### 🤖 Assistant

> 🔧 called: read_file

Now update the demo UI to show the network error message nicely. The existing `repoError` display already shows the error message from the API JSON, so the user-facing message "Could not reach GitHub from this server. Try again in a moment." will automatically appear. Let me verify the current error-display logic in demo.tsx handles it correctly:

> 🔧 **read_file** — web/pages/demo.tsx

### 🤖 Assistant

> 🔧 called: apply_diff

The `handleRepoScan` function catches errors and calls `setRepoError((e as Error).message)`. But there's an edge case: if the browser-side `fetch` itself throws a network error (e.g., the API server is unreachable), `resp.json()` is never reached. In that case we also need a friendly message. Let me update the catch to show the right message for client-side fetch failures too:

> 🔧 **apply_diff** — <<<<<<< SEARCH
:start_line:277
-------
    try {
      const resp = await fetch('/api/scan-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: target }),
      });
      const data: ScanResult = await resp.json();
      if (resp.status === 429 || data.error === 'RATE_LIMIT') {
        setRepoRateLimit(true);
        return;
      }
      if (!resp.ok || data.error) throw new Error(data.error ?? `HTTP ${resp.status}`);
      setRepoResult(data);
    } catch (e) {
      setRepoError((e as Error).message);
    } finally {
      setRepoLoading(false);
    }
=======
    try {
      let resp: Response;
      try {
        resp = await fetch('/api/scan-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: target }),
        });
      } catch {
        // Browser-side network failure (server unreachable, etc.)
        setRepoError('Could not reach GitHub from this server. Try again in a moment.');
        return;
      }
      const data: ScanResult = await resp.json();
      if (resp.status === 429 || data.error === 'RATE_LIMIT') {
        setRepoRateLimit(true);
        return;
      }
      if (!resp.ok || data.error) throw new Error(data.error ?? `HTTP ${resp.status}`);
      setRepoResult(data);
    } catch (e) {
      setRepoError((e as Error).message);
    } finally {
      setRepoLoading(false);
    }
>>>>>>> REPLACE


### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Investigate current codebase structure
[x] Fix ACTION_VERB_NEAR_SECRET false positives (same line/sentence requirement)
[x] Add unit tests for benign lines
[x] UI: deduplicate finding cards by file+line, show multiple rule badges
[x] Make /api/scan-repo return JSON errors always
[x] Show network error message in Demo UI
[-] Run npm test in /scanner and verify detection/FP rates
[ ] Update README numbers if changed


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm.cmd test 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

All 141 tests pass. Now run the evaluation:

> 🔧 **execute_command** — node scanner/node_modules/ts-node/dist/bin.js --project eval/tsconfig.json eval/evaluate.ts 2>&1

### 🤖 Assistant

> 🔧 called: update_todo_list

Detection rate: **80.0%** (16/20), False-positive rate: **0.0%** (0/20) — identical to the prior numbers. The README doesn't need updating.

> 🔧 **update_todo_list** — 
[x] Investigate current codebase structure
[x] Fix ACTION_VERB_NEAR_SECRET false positives (same line/sentence requirement)
[x] Add unit tests for benign lines
[x] UI: deduplicate finding cards by file+line, show multiple rule badges
[x] Make /api/scan-repo return JSON errors always
[x] Show network error message in Demo UI
[x] Run npm test in /scanner and verify detection/FP rates
[x] Update README numbers if changed


### 🤖 Assistant

All done. Here's a summary of every change:

---

### 1. `ACTION_VERB_NEAR_SECRET` false-positive fix — [`scanner/src/rules.ts`](scanner/src/rules.ts:117)

Replaced the ±3-line window check with a **same-line requirement**: both the action verb and the secret keyword must appear on the same line. A secondary sentence-split check (on `.`/`!`/`?`) is included but redundant for the same-line case — it future-proofs multi-sentence lines. A line like `"Run \`npm install\`"` has an action verb but zero secret keywords on that line, so it's never flagged regardless of what nearby lines contain.

### 2. New benign unit tests — [`scanner/src/__tests__/rules.test.ts`](scanner/src/__tests__/rules.test.ts:193)

Added four regression tests:
- `"Run \`npm install\`" next to a malicious line` → only line 1 flagged
- `"Run \`npm test\` to verify"` → no findings
- Plain install-step README block (5 lines) → no findings
- Verb and secret 4 lines apart → no findings (old window logic would have caught this)

Also updated the existing cross-line "fetch + token" test to be a same-line test.

### 3. UI deduplication — [`web/pages/demo.tsx`](web/pages/demo.tsx:66)

Added a `mergeFindings()` function and `MergedFinding` type. Multiple rules hitting the same `(file, line)` are collapsed into a single card whose `FindingRow` renders **one badge per rule** (`rules: string[]`). The summary count and severity sorting both account for the merged representation.

### 4. JSON errors always — [`web/pages/api/scan-repo.ts`](web/pages/api/scan-repo.ts:126)

- Wrapped the real handler in a top-level try/catch that writes `res.status(500).json(...)` for any unexpected throw — no HTML 500 pages can escape.
- Added a `try/catch` around the inner `fetch()` call in `fetchGitHubTree` that throws `{ isNetworkError: true }` on socket-level failures (ECONNRESET, ETIMEDOUT, DNS errors).
- The handler catches `isNetworkError` and returns `{ error: "Could not reach GitHub from this server. Try again in a moment." }` with HTTP 502.

### 5. Network error in Demo UI — [`web/pages/demo.tsx`](web/pages/demo.tsx:277)

Added an inner try/catch around the browser-side `fetch('/api/scan-repo')` call so that if the Next.js API route itself is unreachable (rare but possible), the same friendly message is shown instead of a raw `TypeError: Failed to fetch`.

### Eval results — unchanged
- Detection rate: **80.0%** (16/20) ✅  
- False-positive rate: **0.0%** (0/20) ✅  
- README numbers not changed.