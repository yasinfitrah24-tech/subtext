/**
 * Judge orchestrator — Granite Guardian integration.
 *
 * Sends ONLY flagged snippets (never whole files) to the judge.
 * Provider selection order:
 *   1. Ollama (if OLLAMA_URL is set OR localhost:11434 is reachable)
 *   2. watsonx.ai (if WATSONX_API_KEY + WATSONX_PROJECT_ID + WATSONX_URL are set)
 *   3. cached fallback
 *
 * Each snippet is wrapped as untrusted data inside the providers.
 */

import { Finding } from "../types";
import { JudgeResult, Snippet } from "./types";
import { judgeWithOllama } from "./ollama";
import { judgeWithWatsonx } from "./watsonx";
import { judgeWithCache } from "./cache";
import { loadEnv } from "./loadEnv";

export type { JudgeResult };

/**
 * Convert a Finding into a Snippet (only the flagged text, never the whole file).
 */
function findingToSnippet(finding: Finding): Snippet {
  return {
    file: finding.file,
    line: finding.line,
    rule: finding.rule,
    text: finding.snippet,
  };
}

/**
 * Check whether the Ollama endpoint is reachable.
 * Uses a lightweight /api/tags request with a short timeout.
 */
async function isOllamaAvailable(): Promise<boolean> {
  loadEnv();
  const baseUrl = (
    process.env["OLLAMA_URL"] ?? "http://localhost:11434"
  ).replace(/\/+$/, "");

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(tid);
    return resp.ok;
  } catch {
    clearTimeout(tid);
    return false;
  }
}

/**
 * Check whether watsonx credentials are present in the environment.
 */
function isWatsonxConfigured(): boolean {
  loadEnv();
  return Boolean(
    process.env["WATSONX_API_KEY"] &&
      process.env["WATSONX_PROJECT_ID"] &&
      process.env["WATSONX_URL"]
  );
}

/**
 * Run the judge on a single snippet, using whichever provider is available.
 */
export async function judgeSnippet(snippet: Snippet): Promise<JudgeResult> {
  // JUDGE_PROVIDER=watsonx|ollama|cached forces one provider (default: auto).
  const forced = (process.env["JUDGE_PROVIDER"] ?? "").toLowerCase();
  if (forced === "watsonx" && isWatsonxConfigured()) return judgeWithWatsonx(snippet);
  if (forced === "ollama") return judgeWithOllama(snippet);
  if (forced === "cached") return judgeWithCache(snippet);
  if (await isOllamaAvailable()) {
    return judgeWithOllama(snippet);
  }
  if (isWatsonxConfigured()) {
    return judgeWithWatsonx(snippet);
  }
  return judgeWithCache(snippet);
}

/**
 * Run the judge on all flagged findings (deduplicated by snippet text).
 * Only findings with a non-empty snippet are sent.
 * Returns a map: snippet text → JudgeResult.
 */
export async function judgeFindings(
  findings: Finding[]
): Promise<Map<string, JudgeResult>> {
  const results = new Map<string, JudgeResult>();

  // Deduplicate by snippet text to avoid sending identical content twice
  const seen = new Set<string>();
  const unique: Finding[] = [];
  for (const f of findings) {
    const key = f.snippet.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }

  for (const finding of unique) {
    const snippet = findingToSnippet(finding);
    const result = await judgeSnippet(snippet);
    results.set(finding.snippet.trim(), result);
  }

  return results;
}
