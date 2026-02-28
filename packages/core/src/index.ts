import { computeDiff } from "./diff/compute.js";
import { matchOperations } from "./matcher/match.js";
import { parseOpenApi } from "./parser/openapi.js";
import { formatJson } from "./reporters/json.js";
import { formatMarkdown } from "./reporters/markdown.js";
import { formatTerminal } from "./reporters/terminal.js";
import { scoreReport } from "./scoring/score.js";
import type {
  MatchResult,
  DriftReport,
  OperationSurface,
  ScanOptions,
  SdkMethodSurface
} from "./types/contracts.js";

export * from "./types/contracts.js";

export interface ScanArtifacts {
  report: DriftReport;
  operations: OperationSurface[];
  methods: SdkMethodSurface[];
  matches: MatchResult[];
}

export async function scanWithArtifacts(
  options: ScanOptions,
  methods: SdkMethodSurface[]
): Promise<ScanArtifacts> {
  const operations = await parseOpenApi(options.specPathOrUrl);
  const matches = matchOperations(operations, methods, options.match);
  const rawFindings = computeDiff(operations, methods, matches, options.diff);
  const actionableCategories = new Set(["missing_endpoint", "changed_param", "required_field_added", "type_mismatch", "deprecated_mismatch"]);
  const findings = rawFindings.map((finding) => ({
    ...finding,
    ruleId: finding.ruleId ?? `rule.${finding.category}`,
    isActionable: actionableCategories.has(finding.category),
    evidence: finding.evidence ?? {}
  }));
  const actionableFindings = findings.filter((finding) => finding.isActionable);
  const coverageNotes = findings.filter((finding) => !finding.isActionable);
  const matchedCount = matches.filter((m) => Boolean(m.sdkMethodId)).length;
  const scored = scoreReport(findings, operations.length, matchedCount);
  const unmatchedReasons = matches.reduce<Record<string, number>>((acc, match) => {
    if (match.strategy !== "unmatched" || !match.unmatchedReason) return acc;
    acc[match.unmatchedReason] = (acc[match.unmatchedReason] ?? 0) + 1;
    return acc;
  }, {});

  return {
    operations,
    methods,
    matches,
    report: {
      version: "2",
      score: scored.score,
      scores: scored.scores,
      summary: {
        ...scored.summary,
        actionableFindingsTotal: actionableFindings.length,
        coverageNotesTotal: coverageNotes.length,
        unmatchedReasons
      },
      deductions: scored.deductions,
      weightedDeductions: scored.weightedDeductions,
      categoryCounts: scored.categoryCounts,
      weightedImpact: scored.weightedImpact,
      findings,
      actionableFindings,
      coverageNotes
    }
  };
}

export async function scanWithMethods(
  options: ScanOptions,
  methods: SdkMethodSurface[]
): Promise<DriftReport> {
  const artifacts = await scanWithArtifacts(options, methods);
  return {
    version: "2",
    score: artifacts.report.score,
    scores: artifacts.report.scores,
    summary: artifacts.report.summary,
    deductions: artifacts.report.deductions,
    weightedDeductions: artifacts.report.weightedDeductions,
    categoryCounts: artifacts.report.categoryCounts,
    weightedImpact: artifacts.report.weightedImpact,
    findings: artifacts.report.findings,
    actionableFindings: artifacts.report.actionableFindings,
    coverageNotes: artifacts.report.coverageNotes
  };
}

export function renderReport(
  report: DriftReport,
  format: "terminal" | "json" | "markdown"
): string {
  if (format === "json") return formatJson(report);
  if (format === "markdown") return formatMarkdown(report);
  return formatTerminal(report);
}
