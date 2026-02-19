import type { DriftReport } from "../types/contracts.js";

export function formatMarkdown(report: DriftReport): string {
  const header = `# SDKDrift Report\n\n**Score:** ${report.score}/100\n`;
  const summary = `\n| Metric | Value |\n|---|---|\n| Operations matched | ${report.summary.operationsMatched}/${report.summary.operationsTotal} |\n| Findings | ${report.summary.findingsTotal} |\n`;
  const findings = report.findings
    .map((f) => `- **${f.severity}** \`${f.category}\`: ${f.message}`)
    .join("\n");

  return `${header}${summary}\n## Findings\n${findings || "- None"}\n`;
}
