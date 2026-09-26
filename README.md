# Subtext

Scan untrusted repos for hidden prompt injection before your AI coding agent reads them.

Built with IBM Bob + IBM Granite · Team Triple T · IBM Bob Hackathon 2.0

## Status
🚧 In progress


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
