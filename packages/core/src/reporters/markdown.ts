import type { DriftReport } from "../types/contracts.js";

export function formatMarkdown(report: DriftReport): string {
  const actionable = report.actionableFindings ?? report.findings;
  const coverage = report.coverageNotes ?? [];
  const unmatchedReasons = report.summary.unmatchedReasons ?? {};
  const unmatchedReasonText = Object.keys(unmatchedReasons).length
    ? Object.entries(unmatchedReasons)
        .map(([reason, count]) => `\`${reason}\`: ${count}`)
        .join(", ")
    : "none";

  const header = `# SDKDrift Report\n\n**Score:** ${report.score}/100\n`;
  const summary = `\n| Metric | Value |\n|---|---|\n| Operations matched | ${report.summary.operationsMatched}/${report.summary.operationsTotal} |\n| Findings | ${report.summary.findingsTotal} |\n| Actionable findings | ${report.summary.actionableFindingsTotal ?? actionable.length} |\n| Coverage notes | ${report.summary.coverageNotesTotal ?? coverage.length} |\n| Unmatched reasons | ${unmatchedReasonText} |\n`;
  const findings = actionable
    .map((f) => `- **${f.severity}** \`${f.category}\`: ${f.message}`)
    .join("\n");
  const coverageNotes = coverage.map((f) => `- **${f.severity}** \`${f.category}\`: ${f.message}`).join("\n");

  return `${header}${summary}\n## Actionable Findings\n${findings || "- None"}\n\n## Coverage Notes\n${coverageNotes || "- None"}\n`;
}
