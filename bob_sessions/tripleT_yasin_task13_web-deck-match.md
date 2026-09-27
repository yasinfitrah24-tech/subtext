# Task 13: make the website match the pitch deck word for word. Text-only edits, no logic or styling changes, no new components. Never touch .env files or API code.

1. web/components/Layout.tsx footer: "Built with IBM Bob + Granite" → "Built with IBM Bob + Granite on IBM watsonx".

2. web/pages/index.tsx
   a. Hero card footer: "Context check: IBM Granite" → "Judged by Granite on IBM watsonx".
   b. Results: "false positive rate — zero false alarms on benign repos" → "false positive rate — zero false alarms on benign files".
   c. Results: "benign repos correctly cleared" → "benign files correctly cleared".
   d. Results source note: replace "run npm test in /scanner to reproduce" with "reproduce with eval/evaluate.ts (see README) · 6/6 popular public repos (express, axios, requests, got, chalk, nvm) not blocked". Keep the existing <code> styling for eval/results.json and eval/evaluate.ts.
   e. Bob footer: "17 Bob tasks" → "18 Bob tasks".

3. web/pages/how-it-works.tsx checkpoints:
   - 03 desc: "11 patterns, under 10 ms" → "11 rules, under 1 ms a file"
   - 04 desc: "Flagged snippets only" → "Live on IBM watsonx"

4. web/pages/setup.tsx watsonx card: "Set three env vars." → "Set three env vars (WATSONX_MODEL is optional)."

5. README.md: add row | 13 | Made the website match the pitch deck (watsonx wording, files not repos, eval source) | to the Bob tasks table and change "17 Bob tasks" to "18 Bob tasks".

6. Run `npm test` in scanner/ (must stay 165/165). Show the full diff and stop. Do not commit.

---

**Status:** active  **Date:** 2026-09-27

---

### 👤 User

Task 13: make the website match the pitch deck word for word. Text-only edits, no logic or styling changes, no new components. Never touch .env files or API code.

1. web/components/Layout.tsx footer: "Built with IBM Bob + Granite" → "Built with IBM Bob + Granite on IBM watsonx".

2. web/pages/index.tsx
   a. Hero card footer: "Context check: IBM Granite" → "Judged by Granite on IBM watsonx".
   b. Results: "false positive rate — zero false alarms on benign repos" → "false positive rate — zero false alarms on benign files".
   c. Results: "benign repos correctly cleared" → "benign files correctly cleared".
   d. Results source note: replace "run npm test in /scanner to reproduce" with "reproduce with eval/evaluate.ts (see README) · 6/6 popular public repos (express, axios, requests, got, chalk, nvm) not blocked". Keep the existing <code> styling for eval/results.json and eval/evaluate.ts.
   e. Bob footer: "17 Bob tasks" → "18 Bob tasks".

3. web/pages/how-it-works.tsx checkpoints:
   - 03 desc: "11 patterns, under 10 ms" → "11 rules, under 1 ms a file"
   - 04 desc: "Flagged snippets only" → "Live on IBM watsonx"

4. web/pages/setup.tsx watsonx card: "Set three env vars." → "Set three env vars (WATSONX_MODEL is optional)."

5. README.md: add row | 13 | Made the website match the pitch deck (watsonx wording, files not repos, eval source) | to the Bob tasks table and change "17 Bob tasks" to "18 Bob tasks".

6. Run `npm test` in scanner/ (must stay 165/165). Show the full diff and stop. Do not commit.

---

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[-] Read all target files before making changes
[ ] Edit web/components/Layout.tsx footer
[ ] Edit web/pages/index.tsx (5 changes)
[ ] Edit web/pages/how-it-works.tsx (2 changes)
[ ] Edit web/pages/setup.tsx
[ ] Edit README.md (add row + update count)
[ ] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: read_file, read_file, read_file, read_file, read_file



> 🔧 **read_file** — web/components/Layout.tsx

> 🔧 **read_file** — README.md

> 🔧 **read_file** — web/pages/index.tsx

> 🔧 **read_file** — web/pages/how-it-works.tsx

> 🔧 **read_file** — web/pages/setup.tsx

### 🤖 Assistant

> 🔧 called: update_todo_list

Now I have all the file contents. Let me make all the changes at once.

> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[-] Edit web/components/Layout.tsx footer
[ ] Edit web/pages/index.tsx (5 changes)
[ ] Edit web/pages/how-it-works.tsx (2 changes)
[ ] Edit web/pages/setup.tsx
[ ] Edit README.md (add row + update count)
[ ] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — web/components/Layout.tsx

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[-] Edit web/pages/index.tsx (5 changes)
[ ] Edit web/pages/how-it-works.tsx (2 changes)
[ ] Edit web/pages/setup.tsx
[ ] Edit README.md (add row + update count)
[ ] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — web/pages/index.tsx

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[x] Edit web/pages/index.tsx (5 changes)
[-] Edit web/pages/how-it-works.tsx (2 changes)
[ ] Edit web/pages/setup.tsx
[ ] Edit README.md (add row + update count)
[ ] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — web/pages/how-it-works.tsx

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[x] Edit web/pages/index.tsx (5 changes)
[x] Edit web/pages/how-it-works.tsx (2 changes)
[-] Edit web/pages/setup.tsx
[ ] Edit README.md (add row + update count)
[ ] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — <<<<<<< SEARCH
:start_line:117
-------
            <div className={styles.providerDesc}>Set three env vars. The scanner exchanges your API key for an IAM token automatically.</div>
=======
            <div className={styles.providerDesc}>Set three env vars (WATSONX_MODEL is optional). The scanner exchanges your API key for an IAM token automatically.</div>
>>>>>>> REPLACE


### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[x] Edit web/pages/index.tsx (5 changes)
[x] Edit web/pages/how-it-works.tsx (2 changes)
[x] Edit web/pages/setup.tsx
[-] Edit README.md (add row + update count)
[ ] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: apply_diff



> 🔧 **apply_diff** — README.md

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[x] Edit web/pages/index.tsx (5 changes)
[x] Edit web/pages/how-it-works.tsx (2 changes)
[x] Edit web/pages/setup.tsx
[x] Edit README.md (add row + update count)
[-] Run npm test in scanner/
[ ] Show full diff


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm test

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npx jest --passWithNoTests 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — node_modules/.bin/jest 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — & "node_modules/.bin/jest.cmd" 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-ChildItem node_modules/.bin/ | Where-Object { $_.Name -like "*jest*" }

### 🤖 Assistant

> 🔧 called: execute_command

Node modules aren't installed. Let me install and then run tests.

> 🔧 **execute_command** — npm install 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npm test 2>&1

### 🤖 Assistant

> 🔧 called: update_todo_list

165/165 passing. Now let me show the full diff.

> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[x] Edit web/pages/index.tsx (5 changes)
[x] Edit web/pages/how-it-works.tsx (2 changes)
[x] Edit web/pages/setup.tsx
[x] Edit README.md (add row + update count)
[x] Run npm test in scanner/
[-] Show full diff


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — git diff 2>&1

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Read all target files before making changes
[x] Edit web/components/Layout.tsx footer
[x] Edit web/pages/index.tsx (5 changes)
[x] Edit web/pages/how-it-works.tsx (2 changes)
[x] Edit web/pages/setup.tsx
[x] Edit README.md (add row + update count)
[x] Run npm test in scanner/
[x] Show full diff


### 🤖 Assistant

**165/165 tests pass.** Here's the full diff — 5 files changed, no logic or styling touched:

---

**`web/components/Layout.tsx`**
- `"Built with IBM Bob + Granite"` → `"Built with IBM Bob + Granite on IBM watsonx"`

**`web/pages/index.tsx`**
- Hero card footer: `"Context check: IBM Granite"` → `"Judged by Granite on IBM watsonx"`
- Results label: `"benign repos"` → `"benign files"` (×2)
- Source note: replaced `run npm test in /scanner` with `reproduce with eval/evaluate.ts (see README) · 6/6 popular public repos (express, axios, requests, got, chalk, nvm) not blocked` — [`eval/results.json`](web/pages/index.tsx:197) and [`eval/evaluate.ts`](web/pages/index.tsx:197) keep their existing `<code>` styling
- Bob footer: `"17 Bob tasks"` → `"18 Bob tasks"`

**`web/pages/how-it-works.tsx`**
- Step 03 desc: `"11 patterns, under 10 ms"` → `"11 rules, under 1 ms a file"`
- Step 04 desc: `"Flagged snippets only"` → `"Live on IBM watsonx"`

**`web/pages/setup.tsx`**
- watsonx card: `"Set three env vars."` → `"Set three env vars (WATSONX_MODEL is optional)."`

**`README.md`**
- Added row `| 13 | Made the website match the pitch deck (watsonx wording, files not repos, eval source) |`
- `"17 Bob tasks total"` → `"18 Bob tasks total"`