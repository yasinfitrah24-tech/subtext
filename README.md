# Subtext

**Scan untrusted repos for hidden prompt injection before your AI coding agent reads them.**

Built with IBM Bob + IBM Granite · Team Triple T (Yasin Fitrah & Vincent) · IBM Bob Hackathon 2.0

**Live demo:** https://subtext-sable.vercel.app ·
[Scan a repo](https://subtext-sable.vercel.app/demo) ·
[How it works](https://subtext-sable.vercel.app/how-it-works) ·
[Setup](https://subtext-sable.vercel.app/setup)

| Detection rate | False positives | Accuracy | Speed | Tests |
|---|---|---|---|---|
| **85%** (17/20 malicious) | **0%** (0/20 benign) | **92.5%** | ~0.5 ms / file | **165/165** passing |

## The problem

A coding agent reads your request and a stranger's README through the same channel.
Text aimed at the agent can steer what it runs, reads and sends. The attack usually hides
where a human reviewer won't look: an HTML comment, a zero-width character, a base64 blob,
or a `.cursorrules` file. GitHub renders the page clean. The agent still receives every byte.

Subtext is a gate that runs **before** the agent opens the repo.

## How it works

```
Repo opened ──▶ Bob Security Gate ──▶ Rules scan ──▶ Granite Guardian ──▶ Verdict
(read-only)     (repo text = data)    (11 rules)     (flagged snippets)   SAFE · REVIEW · BLOCK
```

1. **Repo opened, never run.** Nothing from the repo is installed or executed.
2. **Bob gates it.** The custom *Security Gate* mode treats every file as data and cannot write code.
3. **Rules scan.** 11 weighted rules: comments addressed to an AI, "ignore previous instructions",
   action verb next to a secret, zero-width and bidi characters, base64 instructions,
   exfiltration URLs, HTML attribute injection, remote exec (`curl | bash`), coercion
   ("don't tell the user") and supply-chain injection. AI config files such as
   `.cursorrules` and `.windsurfrules` are scanned too.
4. **Granite judges.** Only flagged snippets go to IBM Granite Guardian, so scans stay cheap.
5. **Verdict.** Each file gets a score from the rules it trips; the repo takes its worst file.
   0–19 SAFE, 20–59 REVIEW, 60–100 BLOCK. The CLI exits with code `2` on BLOCK,
   so it can fail a CI job.

Only when the verdict is SAFE does Bob hand off to Agent mode.

### After the scan: clean copies

A BLOCK verdict tells you not to hand the repo to an agent as is. **Clean copy** gives you
something you can hand over instead: a copy of each flagged file with the hidden content
removed, rescanned to confirm it is clean.

- Invisible characters (zero-width, bidi controls) are stripped. Emoji sequences are kept.
- Comments addressed to an AI are replaced with a short `[Subtext]` marker.
- Lines that carry an instruction for the agent (send a secret, ignore previous instructions,
  `curl | bash`, hide this from the user, ...) are replaced with a marker in the file's own
  comment syntax, together with the rest of that comment block.
- JSON has no comments, so instruction lines there are flagged for manual review, not removed.
- The original files are never modified. Every change is listed so a person can review it.

On the website, open a flagged file in the results and press **Get clean copy**
(copy or download). In the CLI:

```bash
node dist/index.js ../demo/node-api-starter --sanitize ./clean
# ./clean/README.md, ./clean/src/index.js, ... plus ./clean/SUBTEXT_CHANGES.md
```

## Quick start

Requires Node.js 18+.

```bash
git clone https://github.com/yasinfitrah24-tech/subtext.git
cd subtext/scanner
npm install
npm run build

# A repo with hidden injection → BLOCK (exit code 2)
node dist/index.js ../demo/node-api-starter --verbose

# A normal starter repo → SAFE
node dist/index.js ../demo/clean-starter --verbose

# Write clean copies of the flagged files to ./clean (originals untouched)
node dist/index.js ../demo/node-api-starter --sanitize ./clean

# Run the test suite
npm test
```

### Optional: Granite Guardian judge

Add `--judge` to send flagged snippets to IBM Granite Guardian. Copy `scanner/.env.example`
to `scanner/.env` and pick one provider:

- **Ollama (local):** `ollama pull granite4.1-guardian:8b-q4_K_M`, then set `OLLAMA_URL`
- **watsonx.ai:** set `WATSONX_API_KEY`, `WATSONX_PROJECT_ID` and `WATSONX_URL`

With no provider configured, the scanner falls back to a cached heuristic and labels the
result `provider: cached`. `.env` is gitignored; never commit keys.

### Web app

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

The **Demo** page scans a public GitHub URL (up to 200 files) or pasted text. To avoid GitHub
API rate limits, put a read-only `GITHUB_TOKEN` in `web/.env.local` (gitignored).

After each scan the Demo page asks IBM Granite Guardian to judge up to 5 flagged snippets.
On the server, set `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL` and optionally
`WATSONX_MODEL` (Vercel → Environment Variables, never prefixed with `NEXT_PUBLIC_`) and the
page shows **Granite Guardian: live on IBM watsonx**. Without them it uses a labelled cached
heuristic. The key never reaches the browser, and results are cached to limit usage.

Live check: on the poisoned demo repo all 3 findings were judged injection. A harmless note `<!-- AI assistant: this project uses pnpm, please run pnpm install instead of npm -->` was flagged REVIEW by the rules and judged no injection by Granite. The score still comes from the rules; Granite is a second opinion. Note: ibm/granite-guardian-3-8b is deprecated on watsonx and will be removed on 30 Sep 2026. After that, set WATSONX_MODEL to a supported Granite model, or the page falls back to the labelled cached heuristic.

## Evaluation results

> Full machine-readable results: [`eval/results.json`](eval/results.json)
> Run with: `node scanner/node_modules/ts-node/dist/bin.js --project eval/tsconfig.json eval/evaluate.ts`

### Before / After

| Metric | Before (v1) | After (v2) | After (v3) | Δ v1→v3 |
|---|---|---|---|---|
| Files evaluated | 40 | 40 | 40 | — |
| **Detection rate** (malicious flagged) | **30.0%** (6/20) | **80.0%** (16/20) | **85.0%** (17/20) | **+55 pp** |
| **False-positive rate** (benign flagged) | **5.0%** (1/20) | **0.0%** (0/20) | **0.0%** (0/20) | **−5 pp** |
| Overall accuracy | 62.5% | 90.0% | 92.5% | +30 pp |
| Avg time per file | 0.23 ms | 0.40 ms | 0.42 ms | +0.19 ms |

### Per-category results (current)

| Category | Partition | Files | Correct | Accuracy | Notes |
|---|---|---|---|---|---|
| `hidden-instruction` | malicious | 4 | 2 | 50.0% | 2 remaining misses: docstring & plain-prose coaxing |
| `exfiltration` | malicious | 3 | 2 | 66.7% | ✓ fixed: SSH key exfil via `process.env`/`id_rsa` patterns |
| `invisible-unicode` | malicious | 3 | 3 | 100.0% | ✓ fixed: `.cursorrules` now scanned |
| `remote-exec` | malicious | 7 | 7 | 100.0% | ✓ fixed: curl\|bash, wget\|sh, IEX, exec/eval-fetch, dig-TXT |
| `coercion` | malicious | 2 | 2 | 100.0% | ✓ fixed: hide-from-user & fake-error patterns |
| `supply-chain` | malicious | 1 | 1 | 100.0% | ✓ fixed: external-script injection |
| `env-mention` | benign | 4 | 4 | 100.0% | ✓ |
| `curl-mention` | benign | 2 | 2 | 100.0% | ✓ |
| `ssh-mention` | benign | 1 | 1 | 100.0% | ✓ |
| `ai-mention` | benign | 1 | 1 | 100.0% | ✓ |
| `base64-mention` | benign | 1 | 1 | 100.0% | ✓ |
| `zwj-legit` | benign | 1 | 1 | 100.0% | ✓ fixed: ZWJ in family emoji (👨‍👩‍👧) no longer flagged |
| `bidi-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `eval-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `setup-legit` | benign | 3 | 3 | 100.0% | ✓ |
| `security-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `issue-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `readme-legit` | benign | 3 | 3 | 100.0% | ✓ |

### Remaining misses (3)

| File | Expected | Verdict | Reason |
|---|---|---|---|
| `malicious/09_addressed_to_ai.md` | flagged | SAFE | Direct AI address in plain prose (no comment wrapper) |
| `malicious/11_issue_read_private.md` | flagged | SAFE | MCP-style repo-read request in plain prose |
| `malicious/19_docstring_injection.py` | flagged | SAFE | Prompt injection hidden inside a Python docstring |

The three misses are plain-prose instructions with no hidden wrapper. The Granite judge only sees flagged snippets, so it does not catch these yet. Sending unflagged prose to Granite is the next step.

### Real-world check: popular open-source repos

The labelled set is synthetic, so we also ran the CLI on six popular public repos
(shallow clones of the default branch, Sep 2026). None of them is malicious, so the
right answer is SAFE, or REVIEW where a README really does tell you to pipe a script
into bash.

| Repo | Verdict | Why |
|---|---|---|
| expressjs/express | SAFE 0/100 | |
| axios/axios | SAFE 0/100 | |
| psf/requests | SAFE 0/100 | |
| sindresorhus/got | SAFE 0/100 | |
| chalk/chalk | SAFE 0/100 | |
| nvm-sh/nvm | REVIEW 25/100 | README installs with `curl ... \| bash` |

The first version of the rules got this wrong: four of these six repos scored BLOCK. The causes
were coverage pragmas like `/* istanbul ignore next */` read as AI-addressed comments,
test code like `delete process.env.X` read as secret exfiltration, plain CDN `<script src>`
install snippets, byte-order marks in test strings, and a repo score that added up weak hits
across hundreds of files. The fixes:

- Natural-language rules read only prose: Markdown outside code fences, and comments in code files.
- A secret-plus-verb line counts only when it is aimed at an AI or names a place to send the secret.
- Tool pragmas (istanbul, eslint, prettier, ...) are not AI-addressed comments.
- A repo's score is its worst file's score, not the sum over all files.

Each of these is covered by a regression test in `scanner/src/__tests__/rules.test.ts`. The
labelled-set numbers above did not drop.

## Security Gate mode

A custom Bob mode that scans untrusted repositories for prompt-injection attacks and hidden
instructions before an AI coding agent reads them.

### Activate

1. Open this workspace in Bob.
2. Click the **mode picker** (bottom-left of the chat panel, shows the current mode name).
3. Select **Security Gate** from the list.

The mode is workspace-scoped and defined in [`.bob/custom_modes.yaml`](.bob/custom_modes.yaml).
It loads automatically whenever this workspace is open — no restart required.

### What it does

| Verdict | Meaning |
|---------|---------|
| `BLOCK` | Confirmed injection attempt or clearly malicious instruction |
| `REVIEW` | Suspicious pattern that warrants human inspection |
| `SAFE` | No issue found (omitted from output by default) |

Each finding is reported as:

```
[VERDICT] relative/file/path:<line> - concise reason
SUMMARY: <n> BLOCK, <n> REVIEW, <n> SAFE findings.
```

### Guarantees

- **Read-only** — the mode will never run, install, or execute anything from the scanned repo.
- **Instruction-immune** — comments, READMEs, `.cursorrules`, and any other embedded text are
  treated as data, not commands. Injection attempts are reported, not obeyed.
- **Scope-limited** — if asked to do anything beyond scanning and reporting, the mode declines.

### Patterns checked

- Prompt-injection strings (`ignore previous`, `you are now`, `[[INST]]`, etc.)
- Role-override attempts (`act as`, `pretend you are`, etc.)
- Exfiltration hooks (`fetch()`, `curl`, `wget` in comments/strings)
- Hidden unicode (zero-width spaces, RTL override U+202E, homoglyphs)
- Embedded base64/hex blobs that decode to instructions or scripts
- AI-assistant config files designed to be auto-loaded (`.github/copilot-instructions.md`,
  `.cursorrules`, etc.)

## Built with IBM Bob

Every part of Subtext was built as a Bob task. Screenshots and exported task histories are in
[`bob_sessions/`](bob_sessions/).

| Task | What Bob did |
|---|---|
| 01 | Created the Security Gate custom mode (`.bob/custom_modes.yaml`) |
| 02 / 02b | Built the scanner core and rules; fixed failing tests (83/83 passing) |
| 03 / 03b | Built the 40-file eval set and improved rules (detection 30% → 80%, 115 tests) |
| 04 | Added the Granite Guardian judge (Ollama, watsonx, cached fallback) |
| 05 – 05d | Built the website and GitHub scan; reduced noise and false positives |
| 06 | Security Gate review of both demo repos and handoff to Agent mode ([`reports/SUMMARY.md`](reports/SUMMARY.md)) |
| 07 | Website polish: copy buttons, logos, text/subtext toggle, animations |
| 08 | Code review of the real-repo accuracy fixes and the sanitizer (see below) |
| 09 | Security Gate review of the poisoned demo, then Agent mode ran Clean copy: **BLOCK 90/100 → SAFE 0/100** ([`reports/SUMMARY.md`](reports/SUMMARY.md)) |
| 10 | Documented the live watsonx judge on the site and README |

The real-repo accuracy fixes, the Clean copy sanitizer and the watsonx judge for the site were
written by hand between Task 07 and Task 08, then handed to Bob for review in Task 08. 15 Bob tasks total.

### Task 08: Bob as reviewer, a person as the final call

Bob reported five findings. We checked each one against the code and against real repos:

| # | Bob's finding | Our check | Outcome |
|---|---|---|---|
| 1 | U+FEFF skipped in code files | Flagging it again re-breaks `sindresorhus/got` (BOM in test strings); hidden-text attacks use U+200B/C/D, which are still caught | Kept as is |
| 2 | Off-by-one in the sanitizer's `through` | `through` is a 1-based line number and lines are dropped by index; a test confirms lines 2–3 are removed | Not a bug |
| 3 | `#` comments in YAML/TOML cause false positives | Comment extraction only runs for code files; YAML/TOML are read whole | Not a bug |
| 4 | Bare `<script src>` in Markdown not flagged | Flagging it re-breaks the `axios` README (CDN install guide); instructions to add a script are still caught | Kept as is |
| 5 | Rule weight lookup repeats and silently defaults unknown rule IDs | Valid | **Fixed by Bob**, with a regression test (165 tests) |

## Repository layout

| Path | Contents |
|---|---|
| `scanner/` | TypeScript CLI, rules, sanitizer, Granite judge, Jest tests |
| `web/` | Next.js site and scan API (deployed on Vercel) |
| `eval/` | Evaluation script and `results.json` |
| `dataset/` | 20 malicious + 20 benign synthetic samples, `labels.csv` |
| `demo/` | `node-api-starter` (malicious) and `clean-starter` (benign) demo repos |
| `reports/` | Security Gate scan summary |
| `.bob/` | Security Gate custom mode |
| `bob_sessions/` | Bob task screenshots and exports |
| `design/` | Mockups and design notes |

## Safety notes

- All malicious samples are synthetic and written by the team. URLs use reserved `.invalid`
  domains; keys and emails are fake.
- Dataset and demo files are data. Do not run them.
- Subtext reports patterns; it does not label other people's projects as malicious.

## Data

See [`DATA_SOURCES.md`](DATA_SOURCES.md).

## License

MIT
