import { readFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_PATH = join(process.cwd(), "config", "_default", "params.yaml");

export function reportDownloadsEnabled() {
  try {
    const config = readFileSync(CONFIG_PATH, "utf8");
    return /report_downloads:\s*\n(?:[ \t]+[^\n]*\n)*?[ \t]+enabled:\s*true\s*(?:#.*)?$/m.test(config);
  } catch {
    return false;
  }
}
