# Subtext test dataset

A labelled corpus of "untrusted repo content" for testing a prompt-injection
scanner. Use it to (a) develop detection rules and (b) report a measurable
accuracy number in the pitch.

## Layout
- `malicious/` — 20 samples, each carrying **one** class of injection pattern
- `benign/` — 20 samples, several deliberately **tricky** (they mention `.env`,
  `ssh`, `curl`, `base64`, or use zero-width joiners in emoji) to test that the
  scanner does not raise false positives
- `labels.csv` — ground truth: `file, label, category, why`

## Safety
Nothing here is a working exploit. Every attacker host uses the reserved
`.invalid` TLD (RFC 6761), so it can never resolve. These files are
**detection targets** for a defensive tool, not weaponised payloads.

## Categories covered (malicious)
| category | seen in the wild |
|---|---|
| hidden-instruction | comments / docstrings addressed to the AI |
| invisible-unicode | Rules File Backdoor (Pillar Security, 2025) |
| remote-exec | `curl\|bash`, `$(dig TXT)`, `eval(requests.get)` — 0DIN (2026) |
| exfiltration | read `.env` / `~/.ssh` / private repos and send out — GitHub MCP (2025) |
| coercion | fake error messages; "hide this from the user" |
| supply-chain | inject external `<script>` into generated code |

## How to score (suggested)
For each file, run the scanner and compare its verdict to `labels.csv`:
- **Detection rate** = malicious files flagged / 20
- **False-positive rate** = benign files flagged / 20

Report both, e.g. *"19/20 detected, 1/20 false positive."* Judges trust honest
numbers more than a claim of perfection.

## Sources
- 0DIN — "Clone This Repo and I Own Your Machine" (Jun 2026)
- Pillar Security — "Rules File Backdoor" (Mar 2025)
- Invariant Labs — "GitHub MCP Exploited" (May 2025)
- OWASP — LLM01:2025 Prompt Injection
