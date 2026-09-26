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

function usage(): void {
  console.error(
    "Usage: scanner <target-directory> [--output <path>] [--verbose] [--judge]"
  );
  process.exit(1);
}

function parseArgs(argv: string[]): {
  targetDir: string;
  outputPath: string;
  verbose: boolean;
  judge: boolean;
} {
  const args = argv.slice(2); // strip node + script
  let targetDir = "";
  let outputPath = "results.json";
  let verbose = false;
  let judge = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" || args[i] === "-o") {
      outputPath = args[++i] ?? outputPath;
    } else if (args[i] === "--verbose" || args[i] === "-v") {
      verbose = true;
    } else if (args[i] === "--judge") {
      judge = true;
    } else if (!args[i].startsWith("-")) {
      targetDir = args[i];
    }
  }

  if (!targetDir) usage();
  return { targetDir, outputPath, verbose, judge };
}

async function main(): Promise<void> {
  const { targetDir, outputPath, verbose, judge } = parseArgs(process.argv);

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

  // Exit with non-zero code for BLOCK verdicts so CI pipelines can catch it
  if (result.verdict === "BLOCK") {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
