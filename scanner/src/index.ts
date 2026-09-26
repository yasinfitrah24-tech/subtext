#!/usr/bin/env node
/**
 * Prompt Injection Scanner — CLI entry point
 *
 * Usage:
 *   scanner <target-directory> [--output <path>] [--verbose]
 *
 * Outputs results.json (or the path given via --output) with:
 *   { score, verdict, findings }
 */

import * as fs from "fs";
import * as path from "path";
import { scanDirectory } from "./scanner";

function usage(): void {
  console.error(
    "Usage: scanner <target-directory> [--output <path>] [--verbose]"
  );
  process.exit(1);
}

function parseArgs(argv: string[]): {
  targetDir: string;
  outputPath: string;
  verbose: boolean;
} {
  const args = argv.slice(2); // strip node + script
  let targetDir = "";
  let outputPath = "results.json";
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" || args[i] === "-o") {
      outputPath = args[++i] ?? outputPath;
    } else if (args[i] === "--verbose" || args[i] === "-v") {
      verbose = true;
    } else if (!args[i].startsWith("-")) {
      targetDir = args[i];
    }
  }

  if (!targetDir) usage();
  return { targetDir, outputPath, verbose };
}

function main(): void {
  const { targetDir, outputPath, verbose } = parseArgs(process.argv);

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
  const elapsed = Date.now() - start;

  const output = JSON.stringify(result, null, 2);
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
    `${verdictColor}[${result.verdict}]${reset} score=${result.score}/100  findings=${result.findings.length}  (${elapsed}ms)`
  );
  console.log(`Results written to: ${path.resolve(outputPath)}`);

  if (verbose && result.findings.length > 0) {
    console.log("\nFindings:");
    for (const f of result.findings) {
      console.log(`  [${f.rule}] ${f.file}:${f.line}`);
      console.log(`    ${f.snippet}`);
    }
  }

  // Exit with non-zero code for BLOCK verdicts so CI pipelines can catch it
  if (result.verdict === "BLOCK") {
    process.exit(2);
  }
}

main();
