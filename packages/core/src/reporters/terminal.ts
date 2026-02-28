import type { DriftReport } from "../types/contracts.js";

export function formatTerminal(report: DriftReport): string {
  const actionable = report.actionableFindings ?? report.findings;
  const coverage = report.coverageNotes ?? [];
  const unmatchedReasons = report.summary.unmatchedReasons ?? {};
  const unmatchedReasonText = Object.keys(unmatchedReasons).length
    ? Object.entries(unmatchedReasons)
        .map(([reason, count]) => `${reason}=${count}`)
        .join(", ")
    : "none";

  const lines = [
    `SDKDrift Report`,
    `Score: ${report.score}/100`,
    `Actionable score: ${report.scores?.actionable ?? report.score}/100`,
    `Coverage score: ${report.scores?.coverage ?? report.score}/100`,
    `Operations: ${report.summary.operationsMatched}/${report.summary.operationsTotal} matched`,
    `Findings: ${report.summary.findingsTotal}`,
    `Actionable: ${report.summary.actionableFindingsTotal ?? actionable.length}`,
    `Coverage notes: ${report.summary.coverageNotesTotal ?? coverage.length}`,
    `Unmatched reasons: ${unmatchedReasonText}`
  ];

  for (const finding of actionable) {
    lines.push(`- [${finding.severity}] ${finding.category}: ${finding.message}`);
  }
  if (coverage.length) {
    lines.push(`Coverage Notes:`);
    for (const finding of coverage) {
      lines.push(`- [${finding.severity}] ${finding.category}: ${finding.message}`);
    }
  }

  return lines.join("\n");
}
