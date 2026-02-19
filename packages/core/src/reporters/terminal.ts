import type { DriftReport } from "../types/contracts.js";

export function formatTerminal(report: DriftReport): string {
  const lines = [
    `SDKDrift Report`,
    `Score: ${report.score}/100`,
    `Operations: ${report.summary.operationsMatched}/${report.summary.operationsTotal} matched`,
    `Findings: ${report.summary.findingsTotal}`
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.category}: ${finding.message}`);
  }

  return lines.join("\n");
}
