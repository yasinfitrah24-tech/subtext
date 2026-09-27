# Task 12: make Granite setup clear for judges: no Ollama download needed. Small change, no new features. Never put real keys anywhere.

1. web/pages/setup.tsx, section 04 "Optional: Granite Guardian":
   - Change the intro paragraph to: "You don't need this to try Subtext. The scanner, Clean copy and tests run without any judge, and the Demo page already runs Granite Guardian live on IBM watsonx. Add a judge to the CLI only if you have your own watsonx key or want to run fully offline."
   - Put the watsonx.ai card first and the Ollama card second. Rename them "watsonx.ai (cloud, recommended)" and "Ollama (local, offline, ~5 GB download)".

2. scanner/src/judge/index.ts: in auto mode, prefer watsonx when it is configured, then Ollama, then cached. Keep JUDGE_PROVIDER overrides as they are. Update the header comment to match.

3. scanner/.env.example: list the watsonx section first and change the Ollama header from "(default — no key required)" to "(optional, local, ~5 GB model download)". Comment out OLLAMA_URL so it is not active by default.

4. README.md "Optional: Granite Guardian judge": add one line at the start: "Not required. The live Demo page already runs Granite Guardian on IBM watsonx." List watsonx before Ollama. Add a row | 12 | Made Granite setup clear for judges: watsonx first, no Ollama download needed | to the Bob tasks table and change "16 Bob tasks" to "17 Bob tasks" in README.md and web/pages/index.tsx.

5. Run `npm test` in scanner/ (all must pass) and `npx tsc --noEmit` in web/. Show the full diff and stop. Do not commit.

---

**Status:** active  **Date:** 2026-09-27

---

### 👤 User

Task 12: make Granite setup clear for judges: no Ollama download needed. Small change, no new features. Never put real keys anywhere.

1. web/pages/setup.tsx, section 04 "Optional: Granite Guardian":
   - Change the intro paragraph to: "You don't need this to try Subtext. The scanner, Clean copy and tests run without any judge, and the Demo page already runs Granite Guardian live on IBM watsonx. Add a judge to the CLI only if you have your own watsonx key or want to run fully offline."
   - Put the watsonx.ai card first and the Ollama card second. Rename them "watsonx.ai (cloud, recommended)" and "Ollama (local, offline, ~5 GB download)".

2. scanner/src/judge/index.ts: in auto mode, prefer watsonx when it is configured, then Ollama, then cached. Keep JUDGE_PROVIDER overrides as they are. Update the header comment to match.

3. scanner/.env.example: list the watsonx section first and change the Ollama header from "(default — no key required)" to "(optional, local, ~5 GB model download)". Comment out OLLAMA_URL so it is not active by default.

4. README.md "Optional: Granite Guardian judge": add one line at the start: "Not required. The live Demo page already runs Granite Guardian on IBM watsonx." List watsonx before Ollama. Add a row | 12 | Made Granite setup clear for judges: watsonx first, no Ollama download needed | to the Bob tasks table and change "16 Bob tasks" to "17 Bob tasks" in README.md and web/pages/index.tsx.

5. Run `npm test` in scanner/ (all must pass) and `npx tsc --noEmit` in web/. Show the full diff and stop. Do not commit.

---

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[-] Read current state of all affected files
[ ] Update web/pages/setup.tsx - section 04 changes
[ ] Update scanner/src/judge/index.ts - auto mode preference order + comment
[ ] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[ ] Update README.md - Guardian section + Bob tasks table row + count
[ ] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[ ] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: read_file, read_file, read_file, read_file



> 🔧 **read_file** — README.md

> 🔧 **read_file** — scanner/.env.example

> 🔧 **read_file** — web/pages/setup.tsx

> 🔧 **read_file** — scanner/src/judge/index.ts

### 🤖 Assistant

> 🔧 called: grep

Now let me read the index.tsx file:

> 🔧 **grep** — 16 Bob tasks|17 Bob tasks

### 🤖 Assistant

> 🔧 called: update_todo_list

Now I have everything I need. Let me apply all the changes:

> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[-] Update web/pages/setup.tsx - section 04 changes
[ ] Update scanner/src/judge/index.ts - auto mode preference order + comment
[ ] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[ ] Update README.md - Guardian section + Bob tasks table row + count
[ ] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[ ] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — web/pages/setup.tsx

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[-] Update scanner/src/judge/index.ts - auto mode preference order + comment
[ ] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[ ] Update README.md - Guardian section + Bob tasks table row + count
[ ] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[ ] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — scanner/src/judge/index.ts

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[x] Update scanner/src/judge/index.ts - auto mode preference order + comment
[-] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[ ] Update README.md - Guardian section + Bob tasks table row + count
[ ] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[ ] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: write_file



> 🔧 **write_file** — scanner/.env.example

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[x] Update scanner/src/judge/index.ts - auto mode preference order + comment
[x] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[-] Update README.md - Guardian section + Bob tasks table row + count
[ ] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[ ] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — README.md

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[x] Update scanner/src/judge/index.ts - auto mode preference order + comment
[x] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[x] Update README.md - Guardian section + Bob tasks table row + count
[-] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[ ] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: search_and_replace



> 🔧 **search_and_replace** — web/pages/index.tsx

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[x] Update scanner/src/judge/index.ts - auto mode preference order + comment
[x] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[x] Update README.md - Guardian section + Bob tasks table row + count
[x] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[-] Run npm test in scanner/
[ ] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm test

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[x] Update scanner/src/judge/index.ts - auto mode preference order + comment
[x] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[x] Update README.md - Guardian section + Bob tasks table row + count
[x] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[x] Run npm test in scanner/
[-] Run npx tsc --noEmit in web/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npx tsc --noEmit

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — ./node_modules/.bin/tsc --noEmit

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — & ".\node_modules\.bin\tsc.cmd" --noEmit

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-ChildItem node_modules\.bin\ | Where-Object { $_.Name -like 'tsc*' }

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm install; if ($?) { npx --no-install tsc --noEmit 2>&1 }

### 🤖 Assistant

> 🔧 called: execute_command

The disk is full — `npm install` in web/ failed due to ENOSPC. Since web/pages/setup.tsx and web/pages/index.tsx are pure TSX with no new imports or type changes (only string content changes), I can validate with the existing node_modules if they exist, or note the constraint. Let me check if there's any existing tsc binary available:

> 🔧 **execute_command** — Test-Path web\node_modules

### 🤖 Assistant

> 🔧 called: execute_command

The `web/node_modules` directory doesn't exist and disk space is insufficient to install. The TypeScript changes in `web/` are limited to:

1. [`web/pages/setup.tsx`](web/pages/setup.tsx) — string content only (no imports, no types changed)
2. [`web/pages/index.tsx`](web/pages/index.tsx) — a single string `"16 Bob tasks"` → `"17 Bob tasks"` (no types changed)

Neither change introduces new imports, new types, or any structural changes that could cause type errors. The tsc check cannot be run due to disk space preventing `npm install`, but the changes are type-safe by inspection.

Now let me show the full diff:

> 🔧 **execute_command** — git diff

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read current state of all affected files
[x] Update web/pages/setup.tsx - section 04 changes
[x] Update scanner/src/judge/index.ts - auto mode preference order + comment
[x] Update scanner/.env.example - reorder sections, update Ollama header, comment out OLLAMA_URL
[x] Update README.md - Guardian section + Bob tasks table row + count
[x] Update web/pages/index.tsx - change "16 Bob tasks" to "17 Bob tasks"
[x] Run npm test in scanner/
[x] Run npx tsc --noEmit in web/
[x] Show full diff


### 🤖 Assistant

All 5 files changed. Here's a summary:

---

**`scanner/src/judge/index.ts`** — auto-mode now prefers watsonx → Ollama → cached. Header comment updated.

**`scanner/.env.example`** — watsonx section first (Provider 1), Ollama second (Provider 2) with updated header `(optional, local, ~5 GB model download)`. `OLLAMA_URL` is commented out.

**`web/pages/setup.tsx`** — intro paragraph replaced with the exact specified text. Cards reordered: `watsonx.ai (cloud, recommended)` first, `Ollama (local, offline, ~5 GB download)` second.

**`README.md`** — "Not required" line added at the top of the Guardian section; watsonx listed before Ollama; task 12 row added to the Bob tasks table; "16 Bob tasks" → "17 Bob tasks".

**`web/pages/index.tsx`** — "16 Bob tasks" → "17 Bob tasks".

**Validation:** `npm test` in `scanner/` — **165/165 passing**. `npx tsc --noEmit` in `web/` could not run (disk full, no `node_modules`); both web changes are string-only with no type or import modifications.