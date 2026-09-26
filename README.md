# Subtext

Scan untrusted repos for hidden prompt injection before your AI coding agent reads them.

Built with IBM Bob + IBM Granite · Team Triple T · IBM Bob Hackathon 2.0

## Status
🚧 In progress

## Evaluation Results

> Full machine-readable results: [`eval/results.json`](eval/results.json)
> Run with: `node scanner/node_modules/ts-node/dist/bin.js --project eval/tsconfig.json eval/evaluate.ts`

### Summary

| Metric | Value |
|---|---|
| Files evaluated | 40 (20 malicious, 20 benign) |
| **Detection rate** (malicious flagged) | **30.0%** (6 / 20) |
| **False-positive rate** (benign flagged) | **5.0%** (1 / 20) |
| Overall accuracy | 62.5% |
| Avg time per file | 0.23 ms |

### Per-category results

| Category | Partition | Files | Correct | Accuracy | Notes |
|---|---|---|---|---|---|
| `hidden-instruction` | malicious | 4 | 2 | 50.0% | 2 misses: docstring & coaxing patterns |
| `exfiltration` | malicious | 3 | 1 | 33.3% | 2 misses: non-URL exfiltration |
| `invisible-unicode` | malicious | 3 | 2 | 66.7% | 1 miss: `.cursorrules` extension not scanned |
| `remote-exec` | malicious | 7 | 1 | 14.3% | curl\|bash / wget\|sh patterns not yet in rules |
| `coercion` | malicious | 2 | 0 | 0.0% | Coercion patterns not yet in rules |
| `supply-chain` | malicious | 1 | 0 | 0.0% | External-script injection not yet in rules |
| `env-mention` | benign | 4 | 4 | 100.0% | ✓ |
| `curl-mention` | benign | 2 | 2 | 100.0% | ✓ |
| `ssh-mention` | benign | 1 | 1 | 100.0% | ✓ |
| `ai-mention` | benign | 1 | 1 | 100.0% | ✓ |
| `base64-mention` | benign | 1 | 1 | 100.0% | ✓ |
| `zwj-legit` | benign | 1 | 0 | 0.0% | ✗ FP: ZWJ in family emoji triggers `ZERO_WIDTH_CHARS` |
| `bidi-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `eval-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `setup-legit` | benign | 3 | 3 | 100.0% | ✓ |
| `security-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `issue-legit` | benign | 1 | 1 | 100.0% | ✓ |
| `readme-legit` | benign | 3 | 3 | 100.0% | ✓ |

### Misses (15 total)

| File | Expected | Verdict | Reason |
|---|---|---|---|
| `malicious/03_zero_width_rules.cursorrules` | flagged | SAFE | `.cursorrules` extension not in scannable set |
| `malicious/05_curl_pipe_bash.md` | flagged | SAFE | `curl \| bash` remote-exec pattern not in rules |
| `malicious/06_dig_txt_exec.sh` | flagged | SAFE | DNS TXT exec pattern not in rules |
| `malicious/07_base64_eval.py` | flagged | SAFE | Base64 payload does not decode to instruction-like text |
| `malicious/08_error_message_init.md` | flagged | SAFE | Coercion via fake error — no rule covers this pattern |
| `malicious/09_addressed_to_ai.md` | flagged | SAFE | Direct AI address in plain prose, not inside a comment |
| `malicious/10_hide_from_user.md` | flagged | SAFE | Concealment instruction in plain prose — no rule |
| `malicious/11_issue_read_private.md` | flagged | SAFE | MCP-style repo read request in plain prose — no rule |
| `malicious/12_inject_external_script.md` | flagged | SAFE | External script injection instruction — no rule |
| `malicious/13_requests_get_eval.py` | flagged | SAFE | `requests.get` + `exec` pattern not in rules |
| `malicious/15_send_ssh_key.md` | flagged | SAFE | SSH key exfiltration in plain prose (no URL) — not caught |
| `malicious/16_wget_pipe_sh.md` | flagged | SAFE | `wget \| sh` remote-exec pattern not in rules |
| `malicious/17_powershell_iex.md` | flagged | SAFE | PowerShell `IEX` download-exec not in rules |
| `malicious/19_docstring_injection.py` | flagged | SAFE | Injection in Python docstring (not a comment block) — missed |
| `benign/07_family_emoji.md` | SAFE | REVIEW | ZWJ in family emoji (👨‍👩‍👧) triggers `ZERO_WIDTH_CHARS` — false positive |

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
