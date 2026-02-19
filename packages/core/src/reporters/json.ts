import type { DriftReport } from "../types/contracts.js";

export function formatJson(report: DriftReport): string {
  return JSON.stringify(report, null, 2);
}
