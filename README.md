# Subtext

**Scan untrusted repos for hidden prompt injection before your AI coding agent reads them.**

Built with IBM Bob + IBM Granite · Team Triple T (Yasin Fitrah & Vincent) · IBM Bob Hackathon 2.0

**Live demo:** https://subtext-sable.vercel.app ·
[Scan a repo](https://subtext-sable.vercel.app/demo) ·
[How it works](https://subtext-sable.vercel.app/how-it-works) ·
[Setup](https://subtext-sable.vercel.app/setup)

| Detection rate | False positives | Accuracy | Speed | Tests |
|---|---|---|---|---|
| **85%** (17/20 malicious) | **0%** (0/20 benign) | **92.5%** | ~0.4 ms / file | **146/146** passing |

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
5. **Verdict.** Score 0–19 SAFE, 20–59 REVIEW, 60–100 BLOCK. The CLI exits with code `2` on BLOCK,
   so it can fail a CI job.

Only when the verdict is SAFE does Bob hand off to Agent mode.

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

The three misses are plain-prose instructions with no hidden wrapper. That is the gap the
Granite Guardian judge step is meant to cover.

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

Small follow-up fixes after Task 07 (CSS animation scoping, one false positive on
`demo/clean-starter`, synced site stats) were made by hand, without Bob.

## Repository layout

| Path | Contents |
|---|---|
| `scanner/` | TypeScript CLI, rules, Granite judge, Jest tests |
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
