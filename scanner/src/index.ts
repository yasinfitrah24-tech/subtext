#!/usr/bin/env node
/**
 * Prompt Injection Scanner — CLI entry point
 *
 * Usage:
 *   scanner <target-directory> [--output <path>] [--verbose] [--judge]
 *
 * Outputs results.json (or the path given via --output) with:
 *   { score, verdict, findings, judge? }
 *
 * --judge   Run the optional Granite Guardian judge step on flagged snippets.
 *           Merges a "judge" key into each finding that has a snippet.
 *           Provider auto-selected: ollama → watsonx → cached.
 */

import * as fs from "fs";
import * as path from "path";
import { scanDirectory } from "./scanner";
import { judgeFindings } from "./judge/index";
import type { JudgeResult } from "./judge/index";
import { Finding } from "./types";
import { sanitize } from "./sanitize";

function usage(): void {
  console.error(
    "Usage: scanner <target-directory> [--output <path>] [--verbose] [--judge] [--sanitize <dir>]"
  );
  process.exit(1);
}

function parseArgs(argv: string[]): {
  targetDir: string;
  outputPath: string;
  verbose: boolean;
  judge: boolean;
  sanitizeDir: string | null;
} {
  const args = argv.slice(2); // strip node + script
  let targetDir = "";
  let outputPath = "results.json";
  let verbose = false;
  let judge = false;
  let sanitizeDir: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" || args[i] === "-o") {
      outputPath = args[++i] ?? outputPath;
    } else if (args[i] === "--verbose" || args[i] === "-v") {
      verbose = true;
    } else if (args[i] === "--judge") {
      judge = true;
    } else if (args[i] === "--sanitize") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        sanitizeDir = next;
        i++;
      } else {
        sanitizeDir = "subtext-clean";
      }
    } else if (!args[i].startsWith("-")) {
      targetDir = args[i];
    }
  }

  if (!targetDir) usage();
  if (sanitizeDir !== null && targetDir && path.resolve(sanitizeDir) === path.resolve(targetDir)) {
    console.error("Error: --sanitize must write to a different folder than the one scanned.");
    process.exit(1);
  }
  return { targetDir, outputPath, verbose, judge, sanitizeDir };
}

async function main(): Promise<void> {
  const { targetDir, outputPath, verbose, judge, sanitizeDir } = parseArgs(process.argv);

  const absTarget = path.resolve(targetDir);
  if (!fs.existsSync(absTarget)) {
    console.error(`Error: directory not found: ${absTarget}`);
    process.exit(1);
  }

  if (verbose) {
    console.log(`Scanning: ${absTarget}`);
  }

  const start = Date.now();
  let result;
  try {
    result = scanDirectory(absTarget);
  } catch (err) {
    console.error(`Scan failed: ${(err as Error).message}`);
    process.exit(1);
  }
  const scanElapsed = Date.now() - start;

  // ----- Optional Granite Guardian judge step -----
  type FindingWithJudge = Finding & { judge?: JudgeResult };
  let findingsOut: FindingWithJudge[] = result.findings;

  if (judge && result.findings.length > 0) {
    if (verbose) {
      console.log(
        `\nRunning Granite Guardian judge on ${result.findings.length} finding(s)…`
      );
    }

    const judgeStart = Date.now();
    const judgeMap = await judgeFindings(result.findings);
    const judgeElapsed = Date.now() - judgeStart;

    // Merge judge result into each finding
    findingsOut = result.findings.map((f) => {
      const jr = judgeMap.get(f.snippet.trim());
      return jr ? { ...f, judge: jr } : f;
    });

    if (verbose) {
      console.log(`Judge completed in ${judgeElapsed}ms`);
      for (const [snippet, jr] of judgeMap) {
        const risk = jr.guardian_risk ? "⚠  RISK" : "✓  SAFE";
        console.log(`  [${jr.provider}] ${risk}  ${snippet.slice(0, 60)}`);
        console.log(`    Reason: ${jr.reason}`);
      }
    }
  }

  const output = JSON.stringify(
    { ...result, findings: findingsOut },
    null,
    2
  );
  fs.writeFileSync(outputPath, output, "utf8");

  // Always print a summary to stdout
  const verdictColor =
    result.verdict === "BLOCK"
      ? "\x1b[31m" // red
      : result.verdict === "REVIEW"
      ? "\x1b[33m" // yellow
      : "\x1b[32m"; // green
  const reset = "\x1b[0m";

  console.log(
    `${verdictColor}[${result.verdict}]${reset} score=${result.score}/100  findings=${result.findings.length}  (${scanElapsed}ms)`
  );
  console.log(`Results written to: ${path.resolve(outputPath)}`);

  if (verbose && result.findings.length > 0) {
    console.log("\nFindings:");
    for (const f of findingsOut) {
      console.log(`  [${f.rule}] ${f.file}:${f.line}`);
      console.log(`    ${f.snippet}`);
    }
  }

  // ----- Optional clean copies of flagged files -----
  if (sanitizeDir !== null && result.findings.length > 0) {
    writeCleanCopies(absTarget, path.resolve(sanitizeDir), result.findings);
  } else if (sanitizeDir !== null) {
    console.log("Nothing to sanitize: no findings.");
  }

  // Exit with non-zero code for BLOCK verdicts so CI pipelines can catch it
  if (result.verdict === "BLOCK") {
    process.exit(2);
  }
}

/**
 * Write a sanitized copy of every flagged file into outDir, mirroring the
 * repo layout, plus SUBTEXT_CHANGES.md listing each edit. The scanned repo is
 * never modified.
 */
function writeCleanCopies(root: string, outDir: string, findings: Finding[]): void {
  const files = [...new Set(findings.map((f) => f.file))].sort();
  const report: string[] = [
    "# Subtext clean copies",
    "",
    `Source: ${root}`,
    "",
    "Each file below is a copy with the flagged content removed or neutralised.",
    "The original repository was not modified. Review the changes before use.",
    "",
  ];
  let remainingTotal = 0;

  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel.startsWith("..")) continue;
    let content: string;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const { clean, changes, remaining } = sanitize(content, rel);
    const dest = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, clean, "utf8");
    remainingTotal += remaining.length;

    report.push(`## ${rel}`, "");
    for (const c of changes) {
      const where = c.through ? `lines ${c.line}-${c.through}` : `line ${c.line}`;
      report.push(`- ${where}: ${c.action} (${c.rules.join(", ")})`);
    }
    if (remaining.length > 0) {
      report.push(`- ${remaining.length} finding(s) could not be removed automatically; review by hand.`);
    }
    report.push("");
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "SUBTEXT_CHANGES.md"), report.join("\n"), "utf8");
  console.log(
    `Clean copies of ${files.length} file(s) written to: ${outDir}` +
      (remainingTotal ? ` (${remainingTotal} finding(s) need manual review)` : "")
  );
}

main().catch((err) => {
  console.error(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
