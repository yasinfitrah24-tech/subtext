/**
 * Load .env from the project root (two levels above scanner/src/judge/).
 * Uses dotenv so that secrets are never hardcoded.
 *
 * Resolution order:
 *   1. <cwd>/.env
 *   2. <__dirname>/../../.env  (scanner root)
 *   3. <__dirname>/../../../.env (repo root)
 *
 * dotenv silently skips files that don't exist, so this is always safe to call.
 */
import * as path from "path";
import * as dotenv from "dotenv";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../.env"),
  ];

  for (const candidate of candidates) {
    const result = dotenv.config({ path: candidate, quiet: true });
    if (!result.error) break; // stop at first file that exists
  }
}
