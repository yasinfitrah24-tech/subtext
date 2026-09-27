# Review these files for bugs, attacker bypasses and false positives. Do not edit anything.
- scanner/src/rules.ts: proseLines(), ACTION_VERB_NEAR_SECRET, COMMENT_AI_ADDRESSED, SUPPLY_CHAIN_INJECT, ZERO_WIDTH_CHARS
- scanner/src/scanner.ts: computeResult() (repo score = worst file)
- scanner/src/sanitize.ts
List at most 5 findings, most severe first, each with file:line, why it matters, and a one-line fix. Be concise.

---

**Status:** active  **Date:** 2026-09-27

---

### 👤 User

Review these files for bugs, attacker bypasses and false positives. Do not edit anything.
- scanner/src/rules.ts: proseLines(), ACTION_VERB_NEAR_SECRET, COMMENT_AI_ADDRESSED, SUPPLY_CHAIN_INJECT, ZERO_WIDTH_CHARS
- scanner/src/scanner.ts: computeResult() (repo score = worst file)
- scanner/src/sanitize.ts
List at most 5 findings, most severe first, each with file:line, why it matters, and a one-line fix. Be concise.

---

### 🤖 Assistant

> 🔧 called: FindSymbol, FindSymbol, GetSymbolsOverview



> 🔧 **FindSymbol** — proseLines

> 🔧 **FindSymbol** — computeResult

> 🔧 **GetSymbolsOverview** — scanner/src/sanitize.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file, read_file



> 🔧 **read_file** — scanner/src/scanner.ts

> 🔧 **read_file** — scanner/src/sanitize.ts

> 🔧 **read_file** — scanner/src/rules.ts

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — scanner/src/rules.ts

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — scanner/src/rules.ts

### 🤖 Assistant

Here are the 5 findings, most severe first:

---

### 1. **Attacker bypass — `ZERO_WIDTH_CHARS` blanket exempts all code files for U+FEFF**
[`rules.ts:269`](scanner/src/rules.ts:269)
```ts
if (cp === 0xFEFF && (isCodeFile(filePath) || (i === 0 && m.index === 0))) continue;
```
`isCodeFile()` returns `true` for every `.js/.ts/.py/...` file, so a U+FEFF injected *anywhere* inside a code file (mid-line, mid-string, payload-hiding position) is silently skipped. The BOM exemption should only cover the very first character of the file.
**Fix:** `if (cp === 0xFEFF && i === 0 && m.index === 0) continue;`

---

### 2. **Attacker bypass — `sanitize.ts` multi-line block comment removal has an off-by-one in `through`**
[`sanitize.ts:169`](scanner/src/sanitize.ts:169)
```ts
if (j - 1 > idx) through = j;   // through = first line AFTER the block
```
`through` is documented as "last line of the removed block", but it is set to `j` (the line *after* the block ends), meaning the final line of a multi-line injection comment is left in the output unredacted. The sanitizer marks one extra line in the audit log but drops one fewer line from `clean`.
**Fix:** `if (j - 1 > idx) through = j - 1;`

---

### 3. **False positive — `proseLines()` extracts `#` comments from YAML/TOML files**
[`rules.ts:110-113`](scanner/src/rules.ts:110)
```ts
if (hash) {
  const h = rest.search(/(^|\s)#(?!!)/);
  if (h !== -1) out += rest.slice(rest.indexOf("#", h) + 1);
}
```
`HASH_COMMENT_EXT` includes `.yaml` and `.toml`. In those formats `#` after a value starts a comment, so anchor strings like `password: ${DB_PASS}  # see .env` produce prose `see .env`, and `ACTION_VERB_NEAR_SECRET` then fires on it. Ordinary YAML config files will generate false positives on documentation comments that mention secrets.
**Fix:** Remove `ya?ml|toml` from `HASH_COMMENT_EXT` (YAML/TOML prose is scanned as-is, not via comment extraction).

---

### 4. **Attacker bypass — `SUPPLY_CHAIN_INJECT` compiled `scriptInject` then immediately voids it**
[`rules.ts:524`](scanner/src/rules.ts:524)
```ts
void scriptInject;
const patterns = [includeScriptInstruction, remoteImport, mustIncludeScript];
```
A literal `<script src="https://evil.com/x.js">` already present in a file is intentionally excluded with the comment "a bare `<script src>` tag is how every CDN install guide looks." But a prompt injection that *is* a bare script tag (e.g., injected into a Markdown file) goes completely undetected because `scriptInject` is never used. At minimum it should apply to non-HTML/non-code files.
**Fix:** Add `scriptInject` to `patterns` when `!isCodeFile(filePath)` and not an HTML file.

---

### 5. **Logic bug — `computeResult()` deduplicates by rule ID but loses weight for same-rule multi-finding files**
[`scanner.ts:129`](scanner/src/scanner.ts:129)
```ts
perFile.get(f.file)!.add(f.rule);   // Set<string> — deduped to one entry per rule
```
This is correct as documented, but `ALL_RULES.find()` is called in a nested loop for every `(file × rule)` pair (O(files × rules²) at worst). More importantly, if a rule is found in a file's findings but its `id` has been renamed or is absent from `ALL_RULES`, it silently falls back to weight `10` — a mismatch that can suppress a BLOCK verdict. There is no validation that `f.rule` round-trips to a known rule.
**Fix:** Build a `Map<RuleId, number>` from `ALL_RULES` once before the loop and throw (or warn) on unknown rule IDs instead of silently defaulting to `10`.

---

### 👤 User

Fix finding #5 only. In scanner/src/scanner.ts computeResult() and web/lib/scanner.ts computeScore(), build a Map of rule id to weight once from ALL_RULES and use it instead of ALL_RULES.find(). If a finding has an unknown rule id, console.warn once and use weight 10. Change nothing else.
Add a test in scanner/src/__tests__/scanner.test.ts: an unknown rule id still scores 10 and triggers a warning.
Run npm.cmd test in /scanner; all tests must pass. Do not start the dev server. Be concise.

---

### 🤖 Assistant

> 🔧 called: read_file, glob



> 🔧 **read_file** — scanner/src/__tests__/scanner.test.ts

> 🔧 **glob** — web/lib/scanner.ts

### 🤖 Assistant

> 🔧 called: glob



> 🔧 **glob** — web/lib/scanner*

### 🤖 Assistant

> 🔧 called: apply_diff

No `web/lib/scanner.ts` exists — only `scanner/src/scanner.ts` needs changing. Now applying both edits:

> 🔧 **apply_diff** — scanner/src/scanner.ts

### 🤖 Assistant

> 🔧 called: apply_diff

Now add the test:

> 🔧 **apply_diff** — scanner/src/__tests__/scanner.test.ts

### 🤖 Assistant

> 🔧 called: execute_command

One concern: the `warnedUnknownRules` set is module-level state, so if a prior test in the same Jest worker already triggered the warning for `TOTALLY_UNKNOWN_RULE`, the `toHaveBeenCalledTimes(1)` check could fail. Let me check if the set needs clearing between tests — since the rule id is unique to this test (`TOTALLY_UNKNOWN_RULE`) and no other test uses it, it's fine.

> 🔧 **execute_command** — npm.cmd test

### 🤖 Assistant

All 165 tests pass. Here's what changed:

**[`scanner/src/scanner.ts:118-119`](scanner/src/scanner.ts:118)** — Two module-level constants before `computeResult`:
- `RULE_WEIGHT`: a `Map<string, number>` built once from `ALL_RULES` — replaces the `ALL_RULES.find()` O(n) call per rule per file.
- `warnedUnknownRules`: a `Set<string>` tracking already-warned IDs so `console.warn` fires exactly once per unknown ID.

**[`scanner/src/__tests__/scanner.test.ts:165`](scanner/src/__tests__/scanner.test.ts:165)** — New test verifies that a finding with `"TOTALLY_UNKNOWN_RULE"` scores `10`, produces verdict `"SAFE"`, and triggers exactly one `console.warn` containing the unknown ID.