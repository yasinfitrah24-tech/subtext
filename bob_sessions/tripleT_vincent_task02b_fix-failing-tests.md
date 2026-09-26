# Run npm.cmd test in /scanner. 3 tests fail:
- Rule 3 ACTION_VERB_NEAR_SECRET: "detects 'read' near '.env'"
- Rule 6 BASE64_INSTRUCTION: "detects base64 with API key instruction" and "includes decoded preview in snippet"
Find the root cause and fix the scanner code (rules.ts), not the tests. Do not weaken or delete any test.
Re-run npm.cmd test until all 83 tests pass, then summarize what was wrong.
Note: on this machine use npm.cmd instead of npm (PowerShell blocks npm.ps1).

---

**Status:** active  **Date:** 2026-09-26

---

### 👤 User

Run npm.cmd test in /scanner. 3 tests fail:
- Rule 3 ACTION_VERB_NEAR_SECRET: "detects 'read' near '.env'"
- Rule 6 BASE64_INSTRUCTION: "detects base64 with API key instruction" and "includes decoded preview in snippet"
Find the root cause and fix the scanner code (rules.ts), not the tests. Do not weaken or delete any test.
Re-run npm.cmd test until all 83 tests pass, then summarize what was wrong.
Note: on this machine use npm.cmd instead of npm (PowerShell blocks npm.ps1).

---

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm.cmd test 2>&1

### 🤖 Assistant

> 🔧 called: read_file, glob



> 🔧 **read_file** — scanner/src/__tests__/rules.test.ts

> 🔧 **glob** — scanner/src/**/*.ts

### 🤖 Assistant

> 🔧 called: list_files



> 🔧 **list_files** — scanner/src

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — scanner/src/rules.ts

### 🤖 Assistant

> 🔧 called: apply_diff

Now I can see both bugs clearly. Let me analyze them:

**Bug 1 — Rule 3 (`ACTION_VERB_NEAR_SECRET`):** The `secretKeyword` regex uses `\.env` but inside a character class `\b...\b`. The pattern is `\b(\.env|...)\b`. The problem: `.env` starts with a dot, and `\b` (word boundary) requires a transition between a word char and a non-word char. A dot (`.`) is a non-word character, so `\b` before `\.env` fails because there's no word character before the dot.

**Bug 2 — Rule 6 (`BASE64_INSTRUCTION`):** The `b64Pattern` uses a negative lookbehind `(?<![A-Za-z0-9+/=])`. For the input `data=ZmV0Y2g...`, the `=` immediately precedes the base64 blob, and `=` is in the lookbehind exclusion set, so the match is rejected.

> 🔧 **apply_diff** — scanner/src/rules.ts

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm.cmd test 2>&1

### 🤖 Assistant

All 83 tests pass. Here's a summary of the two root causes and fixes:

---

### Root Cause 1 — Rule 3: `\.env` behind `\b` never matched

**File:** [`rules.ts` line 86](scanner/src/rules.ts:86)

The original `secretKeyword` pattern was:
```
/\b(\.env|api_key|...)\b/i
```
`\b` is a word-boundary assertion — it requires a transition between a `\w` (word) character and a `\W` (non-word) character. The dot `.` is a `\W` character, so `\b` immediately before `\.env` could never match: there is no word character on the left side of the dot to form a boundary. The text `"read the .env file"` therefore produced zero matches.

**Fix:** Split the pattern so `.env` uses its own boundary anchor (`\.env\b`), while all truly word-character-starting terms keep `\b...\b`:
```ts
/(\.env\b|\b(?:api[_\s-]?key|...|token)\b)/i
```

---

### Root Cause 2 — Rule 6: `=` in lookbehind excluded base64 after `data=`

**File:** [`rules.ts` line 166](scanner/src/rules.ts:166)

The original `b64Pattern` used:
```
/(?<![A-Za-z0-9+/=])([A-Za-z0-9+/]{40,}={0,2})(?![A-Za-z0-9+/=])/g
```
The negative lookbehind `(?<![A-Za-z0-9+/=])` excluded `=` from the characters allowed immediately before a match. In the test input `data=ZmV0...`, the `=` sign from `data=` immediately precedes the base64 blob, so the lookbehind rejected it entirely. The same applied to the trailing lookahead.

**Fix:** Remove `=` from both the lookbehind and lookahead. An `=` character is only valid *inside* a base64 string as padding (at the end), not as a valid continuation — so excluding it from the surrounding context check was over-broad and broke legitimate `key=<base64>` patterns:
```ts
/(?<![A-Za-z0-9+/])([A-Za-z0-9+/]{40,}={0,2})(?![A-Za-z0-9+/])/g
```