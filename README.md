# Subtext

Scan untrusted repos for hidden prompt injection before your AI coding agent reads them.

Built with IBM Bob + IBM Granite · Team Triple T · IBM Bob Hackathon 2.0

## Status
🚧 In progress

## Evaluation Results

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


## Bob sessions
Screenshots and exported task histories for every Bob task are in [`bob_sessions/`](bob_sessions/).

## Data
See [`DATA_SOURCES.md`](DATA_SOURCES.md).

## License
MIT

**Live demo:** coming soon
