import * as fs from "fs";
import * as path from "path";
import { Finding, ScanResult, Verdict } from "./types";
import { ALL_RULES } from "./rules";

// File extensions to scan (text-based files only — never execute)
const SCANNABLE_EXTENSIONS = new Set([
  ".md", ".txt", ".html", ".htm", ".xml", ".svg",
  ".json", ".yaml", ".yml", ".toml", ".ini", ".env",
  ".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs",
  ".py", ".rb", ".php", ".java", ".go", ".rs",
  ".sh", ".bash", ".zsh", ".fish", ".ps1",
  ".css", ".scss", ".sass", ".less",
  ".csv", ".rst", ".tex",
  // AI coding-agent config files (treat as data — never execute)
  ".cursorrules", ".windsurfrules", ".mdc",
]);

// Extensionless filenames that are always scanned
const SCANNABLE_BASENAMES = new Set([
  "AGENTS.md", "CLAUDE.md",
  "copilot-instructions.md",  // matched by extension above, but listed for clarity
]);

// Maximum file size to scan (4 MB) — larger files are skipped for performance
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export interface FileScanResult {
  file: string;
  findings: Finding[];
  skipped?: string;
}

/**
 * Scan a single file. Returns findings from all rules.
 * Never executes the file — read-only.
 */
export function scanFile(filePath: string): FileScanResult {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  if (!SCANNABLE_EXTENSIONS.has(ext) && !SCANNABLE_BASENAMES.has(base)) {
    return { file: filePath, findings: [], skipped: "unsupported extension" };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return { file: filePath, findings: [], skipped: "cannot stat file" };
  }

  if (stat.size > MAX_FILE_BYTES) {
    return { file: filePath, findings: [], skipped: "file too large" };
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return { file: filePath, findings: [], skipped: "cannot read file" };
  }

  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];

  for (const rule of ALL_RULES) {
    const ruleFindings = rule.check(content, lines, filePath);
    findings.push(...ruleFindings);
  }

  return { file: filePath, findings };
}

/**
 * Recursively collect all file paths under a directory.
 */
export function collectFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      // Skip hidden directories (e.g. .git, .node_modules)
      if (entry.name.startsWith(".") && entry.isDirectory()) continue;
      if (entry.name === "node_modules" && entry.isDirectory()) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Compute a 0–100 score and verdict from all findings.
 *
 * Scoring model:
 *  - Each finding contributes its rule's weight.
 *  - Findings of the same rule on the same file are counted once (dedup).
 *  - Total is capped at 100.
 *
 * Verdict thresholds:
 *  - SAFE  : score  0–19
 *  - REVIEW: score 20–59
 *  - BLOCK : score 60–100
 */
export function computeResult(allFindings: Finding[]): ScanResult {
  if (allFindings.length === 0) {
    return { score: 0, verdict: "SAFE", findings: [] };
  }

  // Score each file on its own (each rule counts once per file), then take
  // the worst file. Summing across files would let a large, healthy repo
  // reach BLOCK from many unrelated weak hits.
  const perFile = new Map<string, Set<string>>();
  for (const f of allFindings) {
    if (!perFile.has(f.file)) perFile.set(f.file, new Set());
    perFile.get(f.file)!.add(f.rule);
  }
  let rawScore = 0;
  for (const rules of perFile.values()) {
    let fileScore = 0;
    for (const id of rules) {
      const rule = ALL_RULES.find((r) => r.id === id);
      fileScore += rule ? rule.weight : 10;
    }
    rawScore = Math.max(rawScore, fileScore);
  }

  const score = Math.min(100, rawScore);
  const verdict: Verdict =
    score >= 60 ? "BLOCK" : score >= 20 ? "REVIEW" : "SAFE";

  return { score, verdict, findings: allFindings };
}

/**
 * Scan an entire directory tree and return a consolidated ScanResult.
 */
export function scanDirectory(targetDir: string): ScanResult {
  const absDir = path.resolve(targetDir);

  if (!fs.existsSync(absDir)) {
    throw new Error(`Target directory does not exist: ${absDir}`);
  }

  const files = collectFiles(absDir);
  const allFindings: Finding[] = [];

  for (const file of files) {
    const result = scanFile(file);
    allFindings.push(...result.findings);
  }

  return computeResult(allFindings);
}
