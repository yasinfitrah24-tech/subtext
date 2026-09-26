/**
 * Evaluation script for the prompt-injection scanner.
 *
 * Usage (from workspace root):
 *   npx ts-node eval/evaluate.ts
 *
 * All dataset files are treated strictly as data. Their contents are
 * passed to the scanner for pattern-matching only — never executed or
 * interpreted as instructions.
 *
 * Outputs:
 *   eval/results.json  — full machine-readable results
 *   stdout             — summary table
 */

import * as fs from "fs";
import * as path from "path";
import { scanFile, computeResult } from "../scanner/src/scanner";
import { Verdict } from "../scanner/src/types";

// ---------------------------------------------------------------------------
// Paths (all relative to workspace root)
// ---------------------------------------------------------------------------
const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const DATASET_ROOT = path.join(WORKSPACE_ROOT, "subtext-dataset", "dataset");
const MALICIOUS_DIR = path.join(DATASET_ROOT, "malicious");
const BENIGN_DIR = path.join(DATASET_ROOT, "benign");
const LABELS_CSV = path.join(DATASET_ROOT, "labels.csv");
const OUTPUT_PATH = path.join(WORKSPACE_ROOT, "eval", "results.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LabelRow {
  file: string;       // e.g. "malicious/01_hidden_comment_read_env.md"
  label: "malicious" | "benign";
  category: string;
  why: string;
}

interface FileResult {
  file: string;
  label: "malicious" | "benign";
  category: string;
  verdict: Verdict;
  score: number;
  flagged: boolean;   // REVIEW or BLOCK counts as flagged
  correct: boolean;
  timingMs: number;
  findings: { rule: string; line: number; snippet: string }[];
  why: string;        // label reason from CSV
}

// ---------------------------------------------------------------------------
// Parse labels.csv (treat as plain data — never execute)
// ---------------------------------------------------------------------------
function parseLabels(csvPath: string): Map<string, LabelRow> {
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("file,"));
  const map = new Map<string, LabelRow>();
  for (const line of lines) {
    // CSV may contain commas inside quoted fields — parse manually
    const [file, label, category, ...rest] = line.split(",");
    const why = rest.join(",").replace(/^"|"$/g, "");
    if (file && label) {
      map.set(file.trim(), {
        file: file.trim(),
        label: label.trim() as "malicious" | "benign",
        category: category.trim(),
        why,
      });
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Scan one file and derive a per-file verdict
// ---------------------------------------------------------------------------
function evalFile(absPath: string, labelKey: string, row: LabelRow): FileResult {
  const t0 = Date.now();
  const scanResult = scanFile(absPath);
  const result = computeResult(scanResult.findings);
  const timingMs = Date.now() - t0;

  const flagged = result.verdict === "REVIEW" || result.verdict === "BLOCK";
  const correct =
    row.label === "malicious" ? flagged   // TP: malicious must be flagged
                               : !flagged; // TN: benign must NOT be flagged

  return {
    file: labelKey,
    label: row.label,
    category: row.category,
    verdict: result.verdict,
    score: result.score,
    flagged,
    correct,
    timingMs,
    findings: result.findings.map((f) => ({
      rule: f.rule,
      line: f.line,
      snippet: f.snippet,
    })),
    why: row.why,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  // 1. Parse labels
  const labels = parseLabels(LABELS_CSV);

  // 2. Collect files from both partitions
  const allLabelKeys: string[] = [];
  for (const fname of fs.readdirSync(MALICIOUS_DIR).sort()) {
    allLabelKeys.push(`malicious/${fname}`);
  }
  for (const fname of fs.readdirSync(BENIGN_DIR).sort()) {
    allLabelKeys.push(`benign/${fname}`);
  }

  // 3. Run scanner on every file
  const fileResults: FileResult[] = [];
  for (const labelKey of allLabelKeys) {
    const row = labels.get(labelKey);
    if (!row) {
      console.warn(`Warning: no label found for ${labelKey} — skipping`);
      continue;
    }
    const partition = labelKey.startsWith("malicious/") ? "malicious" : "benign";
    const fname = path.basename(labelKey);
    const absPath = path.join(partition === "malicious" ? MALICIOUS_DIR : BENIGN_DIR, fname);
    fileResults.push(evalFile(absPath, labelKey, row));
  }

  // 4. Aggregate metrics
  const malicious = fileResults.filter((r) => r.label === "malicious");
  const benign    = fileResults.filter((r) => r.label === "benign");

  const truePositives  = malicious.filter((r) => r.flagged).length;
  const falseNegatives = malicious.filter((r) => !r.flagged).length;
  const trueNegatives  = benign.filter((r) => !r.flagged).length;
  const falsePositives = benign.filter((r) => r.flagged).length;

  const detectionRate     = malicious.length ? truePositives  / malicious.length : 0;
  const falsePositiveRate = benign.length    ? falsePositives / benign.length    : 0;

  const avgTimingMs =
    fileResults.reduce((s, r) => s + r.timingMs, 0) / (fileResults.length || 1);

  // 5. Per-category breakdown
  const categoryMap = new Map<string, { total: number; correct: number; flagged: number; label: string }>();
  for (const r of fileResults) {
    if (!categoryMap.has(r.category)) {
      categoryMap.set(r.category, { total: 0, correct: 0, flagged: 0, label: r.label });
    }
    const c = categoryMap.get(r.category)!;
    c.total++;
    if (r.correct) c.correct++;
    if (r.flagged) c.flagged++;
  }
  const perCategory: Record<string, unknown> = {};
  for (const [cat, c] of categoryMap.entries()) {
    perCategory[cat] = {
      label: c.label,
      total: c.total,
      correct: c.correct,
      accuracy: parseFloat((c.correct / c.total).toFixed(4)),
      flaggedCount: c.flagged,
    };
  }

  // 6. Misses
  const misses = fileResults
    .filter((r) => !r.correct)
    .map((r) => ({
      file: r.file,
      label: r.label,
      category: r.category,
      verdict: r.verdict,
      score: r.score,
      reason: r.label === "malicious"
        ? `Scanner returned ${r.verdict} (not flagged). Expected REVIEW or BLOCK. Context: ${r.why}`
        : `Scanner returned ${r.verdict} (flagged). Expected SAFE. Context: ${r.why}`,
      findings: r.findings,
    }));

  // 7. Compose output object
  const output = {
    runAt: new Date().toISOString(),
    summary: {
      totalFiles:        fileResults.length,
      maliciousFiles:    malicious.length,
      benignFiles:       benign.length,
      truePositives,
      falseNegatives,
      trueNegatives,
      falsePositives,
      detectionRate:     parseFloat(detectionRate.toFixed(4)),
      falsePositiveRate: parseFloat(falsePositiveRate.toFixed(4)),
      accuracy:          parseFloat(((truePositives + trueNegatives) / fileResults.length).toFixed(4)),
      avgTimingMs:       parseFloat(avgTimingMs.toFixed(2)),
    },
    perCategory,
    misses,
    fileResults,
  };

  // 8. Write results.json
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  // 9. Print summary to stdout
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  console.log("\n=== Prompt-Injection Scanner Evaluation ===\n");
  console.log(`Files evaluated : ${fileResults.length} (${malicious.length} malicious, ${benign.length} benign)`);
  console.log(`Detection rate  : ${pct(detectionRate)}  (${truePositives}/${malicious.length} malicious flagged)`);
  console.log(`False-pos rate  : ${pct(falsePositiveRate)}  (${falsePositives}/${benign.length} benign flagged)`);
  console.log(`Overall accuracy: ${pct((truePositives + trueNegatives) / fileResults.length)}`);
  console.log(`Avg time/file   : ${avgTimingMs.toFixed(2)} ms`);
  console.log(`\nMisses (${misses.length}):`);
  if (misses.length === 0) {
    console.log("  (none)");
  } else {
    for (const m of misses) {
      console.log(`  [${m.label.toUpperCase()}] ${m.file}  verdict=${m.verdict}`);
      console.log(`    → ${m.reason}`);
    }
  }
  console.log(`\nFull results written to: ${OUTPUT_PATH}\n`);
}

main();
