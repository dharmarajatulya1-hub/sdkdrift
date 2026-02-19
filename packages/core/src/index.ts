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
  const findings = computeDiff(operations, methods, matches);
  const matchedCount = matches.filter((m) => Boolean(m.sdkMethodId)).length;
  const scored = scoreReport(findings, operations.length, matchedCount);

  return {
    operations,
    methods,
    matches,
    report: {
      version: "1",
      score: scored.score,
      summary: scored.summary,
      deductions: scored.deductions,
      findings
    }
  };
}

export async function scanWithMethods(
  options: ScanOptions,
  methods: SdkMethodSurface[]
): Promise<DriftReport> {
  const artifacts = await scanWithArtifacts(options, methods);
  return {
    version: "1",
    score: artifacts.report.score,
    summary: artifacts.report.summary,
    deductions: artifacts.report.deductions,
    findings: artifacts.report.findings
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
