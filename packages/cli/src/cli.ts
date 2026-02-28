#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { renderReport, scanWithArtifacts } from "@sdkdrift/core";
import type { DiffOptions, MatchOptions } from "@sdkdrift/core";
import { scanPythonSdk, scanTypeScriptSdk } from "@sdkdrift/python-scanner";
import { load } from "js-yaml";
import packageJson from "../package.json" with { type: "json" };

type RawConfig = {
  mapping?: {
    overrides?: Array<{ operationId?: string; sdkMethod?: string }>;
  };
  match?: {
    heuristicThreshold?: number;
    mode?: "precision" | "balanced" | "recall";
    minConfidenceActionable?: number;
    minTop2Margin?: number;
    abstainOverGuess?: boolean;
  };
  diff?: {
    ignore?: {
      extraMethods?: string[];
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateConfig(config: unknown, configPath: string): RawConfig {
  if (!isRecord(config)) {
    throw new Error(`Invalid config at ${configPath}: root must be a YAML object`);
  }

  const raw = config as RawConfig;
  if (raw.match && !isRecord(raw.match)) {
    throw new Error(`Invalid config at ${configPath}: match must be an object`);
  }
  if (typeof raw.match?.mode !== "undefined" && !["precision", "balanced", "recall"].includes(String(raw.match.mode))) {
    throw new Error(`Invalid config at ${configPath}: match.mode must be one of precision|balanced|recall`);
  }
  if (typeof raw.match?.heuristicThreshold !== "undefined") {
    const threshold = raw.match.heuristicThreshold;
    if (typeof threshold !== "number" || Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error(`Invalid config at ${configPath}: match.heuristicThreshold must be a number between 0 and 1`);
    }
  }
  if (typeof raw.match?.minConfidenceActionable !== "undefined") {
    const value = raw.match.minConfidenceActionable;
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      throw new Error(`Invalid config at ${configPath}: match.minConfidenceActionable must be a number between 0 and 1`);
    }
  }
  if (typeof raw.match?.minTop2Margin !== "undefined") {
    const value = raw.match.minTop2Margin;
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      throw new Error(`Invalid config at ${configPath}: match.minTop2Margin must be a number between 0 and 1`);
    }
  }
  if (typeof raw.match?.abstainOverGuess !== "undefined" && typeof raw.match.abstainOverGuess !== "boolean") {
    throw new Error(`Invalid config at ${configPath}: match.abstainOverGuess must be a boolean`);
  }

  if (raw.mapping && !isRecord(raw.mapping)) {
    throw new Error(`Invalid config at ${configPath}: mapping must be an object`);
  }
  if (typeof raw.mapping?.overrides !== "undefined" && !Array.isArray(raw.mapping.overrides)) {
    throw new Error(`Invalid config at ${configPath}: mapping.overrides must be an array`);
  }

  const seenOperationIds = new Set<string>();
  for (const [index, entry] of (raw.mapping?.overrides ?? []).entries()) {
    if (!isRecord(entry)) {
      throw new Error(`Invalid config at ${configPath}: mapping.overrides[${index}] must be an object`);
    }
    const operationId = entry.operationId;
    const sdkMethod = entry.sdkMethod;
    if (typeof operationId !== "string" || operationId.trim().length === 0) {
      throw new Error(`Invalid config at ${configPath}: mapping.overrides[${index}].operationId must be a non-empty string`);
    }
    if (typeof sdkMethod !== "string" || sdkMethod.trim().length === 0) {
      throw new Error(`Invalid config at ${configPath}: mapping.overrides[${index}].sdkMethod must be a non-empty string`);
    }
    if (seenOperationIds.has(operationId)) {
      throw new Error(`Invalid config at ${configPath}: duplicate override for operationId '${operationId}'`);
    }
    seenOperationIds.add(operationId);
  }

  if (typeof raw.diff !== "undefined" && !isRecord(raw.diff)) {
    throw new Error(`Invalid config at ${configPath}: diff must be an object`);
  }
  if (typeof raw.diff?.ignore !== "undefined" && !isRecord(raw.diff.ignore)) {
    throw new Error(`Invalid config at ${configPath}: diff.ignore must be an object`);
  }
  if (typeof raw.diff?.ignore?.extraMethods !== "undefined" && !Array.isArray(raw.diff.ignore.extraMethods)) {
    throw new Error(`Invalid config at ${configPath}: diff.ignore.extraMethods must be an array`);
  }
  for (const [index, pattern] of (raw.diff?.ignore?.extraMethods ?? []).entries()) {
    if (typeof pattern !== "string" || pattern.trim().length === 0) {
      throw new Error(
        `Invalid config at ${configPath}: diff.ignore.extraMethods[${index}] must be a non-empty string`
      );
    }
    try {
      // Validate regex syntax ahead of runtime to avoid silent misconfiguration.
      // eslint-disable-next-line no-new
      new RegExp(pattern);
    } catch {
      throw new Error(
        `Invalid config at ${configPath}: diff.ignore.extraMethods[${index}] is not a valid regex pattern`
      );
    }
  }

  return raw;
}

async function loadScanConfig(
  configPath?: string
): Promise<{ match?: MatchOptions; diff?: DiffOptions } | undefined> {
  if (!configPath) return undefined;
  const content = await readFile(configPath, "utf8");
  const parsed = load(content);
  const config = validateConfig(parsed, configPath);
  const overrides: Record<string, string> = {};
  for (const entry of config.mapping?.overrides ?? []) {
    if (typeof entry.operationId === "string" && typeof entry.sdkMethod === "string") {
      overrides[entry.operationId] = entry.sdkMethod;
    }
  }

  const matchOptions: MatchOptions = {};
  if (Object.keys(overrides).length > 0) {
    matchOptions.overrides = overrides;
  }
  if (typeof config.match?.heuristicThreshold === "number") {
    matchOptions.heuristicThreshold = config.match.heuristicThreshold;
  }
  if (typeof config.match?.mode === "string") {
    matchOptions.mode = config.match.mode;
  }
  if (typeof config.match?.minConfidenceActionable === "number") {
    matchOptions.minConfidenceActionable = config.match.minConfidenceActionable;
  }
  if (typeof config.match?.minTop2Margin === "number") {
    matchOptions.minTop2Margin = config.match.minTop2Margin;
  }
  if (typeof config.match?.abstainOverGuess === "boolean") {
    matchOptions.abstainOverGuess = config.match.abstainOverGuess;
  }

  const diffOptions: DiffOptions = {};
  const extraMethodPatterns = config.diff?.ignore?.extraMethods;
  if (Array.isArray(extraMethodPatterns) && extraMethodPatterns.length > 0) {
    diffOptions.ignoreExtraMethods = extraMethodPatterns;
  }

  const output: { match?: MatchOptions; diff?: DiffOptions } = {};
  if (Object.keys(matchOptions).length > 0) output.match = matchOptions;
  if (Object.keys(diffOptions).length > 0) output.diff = diffOptions;
  return Object.keys(output).length > 0 ? output : undefined;
}

async function run(): Promise<number> {
  const program = new Command();

  program
    .name("sdkdrift")
    .description("Detect drift between OpenAPI specs and SDK surfaces")
    .version(packageJson.version);

  program
    .command("scan")
    .requiredOption("--spec <pathOrUrl>", "OpenAPI file path or URL")
    .requiredOption("--sdk <path>", "SDK root directory")
    .requiredOption("--lang <python|ts>", "SDK language")
    .option("--format <terminal|json|markdown>", "Report output format", "terminal")
    .option("--verbose", "Print matcher diagnostics to stderr", false)
    .option("--compat-v1", "Emit v1-compatible JSON shape when format=json", false)
    .option("--config <path>", "Path to sdkdrift.config.yaml")
    .option("--out <path>", "Write output to file path")
    .option("--min-score <number>", "Fail if score is below threshold", (v) => Number(v))
    .action(async (args) => {
      const lang = args.lang as "python" | "ts";
      const scanConfig = await loadScanConfig(args.config as string | undefined);
      const methods =
        lang === "python" ? await scanPythonSdk(args.sdk as string) : await scanTypeScriptSdk(args.sdk as string);

      const artifacts = await scanWithArtifacts(
        {
          specPathOrUrl: args.spec as string,
          sdkPath: args.sdk as string,
          language: lang,
          minScore: args.minScore as number | undefined,
          match: scanConfig?.match,
          diff: scanConfig?.diff
        },
        methods
      );
      const { report, matches } = artifacts;

      const format = (args.format as "terminal" | "json" | "markdown") ?? "terminal";
      const output = renderReport(report, format);
      const outputValue =
        Boolean(args.compatV1) && format === "json"
          ? JSON.stringify(toV1Compat(report), null, 2)
          : output;

      if (args.out) {
        await writeFile(args.out as string, outputValue, "utf8");
      } else {
        process.stdout.write(`${outputValue}\n`);
      }

      if (Boolean(args.verbose)) {
        const strategyCounts = matches.reduce<Record<string, number>>((acc, match) => {
          acc[match.strategy] = (acc[match.strategy] ?? 0) + 1;
          return acc;
        }, {});
        const unmatched = matches.filter((m) => !m.sdkMethodId).map((m) => m.operationId);

        process.stderr.write(
          [
            "[sdkdrift:verbose]",
            `operations=${report.summary.operationsTotal}`,
            `methods=${methods.length}`,
            `strategies=${JSON.stringify(strategyCounts)}`,
            unmatched.length ? `unmatched=${unmatched.join(",")}` : "unmatched=none"
          ].join(" ") + "\n"
        );
        process.stderr.write(renderVerboseFindingExplanations(artifacts));
      }

      if (typeof args.minScore === "number" && report.score < args.minScore) {
        process.exitCode = 2;
      }
    });

  await program.parseAsync(process.argv);
  return typeof process.exitCode === "number" ? process.exitCode : 0;
}

function normalizeParamName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasBagParam(method: { params: Array<{ name: string }> } | undefined): boolean {
  if (!method) return false;
  return method.params.some((param) => {
    const name = normalizeParamName(param.name);
    return name.includes("request") || name.includes("params") || name.includes("options") || name.includes("input");
  });
}

function renderVerboseFindingExplanations(
  artifacts: Awaited<ReturnType<typeof scanWithArtifacts>>
): string {
  const lines: string[] = [];
  const operationsById = new Map(artifacts.operations.map((operation) => [operation.operationId, operation]));
  const methodsById = new Map(artifacts.methods.map((method) => [method.id, method]));
  const matchesByOperation = new Map(artifacts.matches.map((match) => [match.operationId, match]));

  for (const finding of artifacts.report.findings) {
    const operation = finding.operationId ? operationsById.get(finding.operationId) : undefined;
    const method = finding.sdkMethodId ? methodsById.get(finding.sdkMethodId) : undefined;
    const match = finding.operationId ? matchesByOperation.get(finding.operationId) : undefined;
    const topMargin = typeof match?.evidence?.topMargin === "number" ? match.evidence.topMargin : undefined;
    const specParamCount = operation ? operation.pathParams.length + operation.queryParams.length : 0;
    const sdkParamCount = method?.params.length ?? 0;
    const unknownParamCount = method?.params.filter((param) => param.in === "unknown").length ?? 0;
    const bodyCheck = operation?.requestBody ? "checked" : "n/a";
    const deprecationCheck =
      typeof operation?.deprecated === "boolean" && typeof method?.deprecated === "boolean" ? "checked" : "n/a";

    lines.push(`[sdkdrift:verbose:finding] id=${finding.id} category=${finding.category} actionable=${Boolean(finding.isActionable)}`);
    lines.push(
      `  why matched: strategy=${match?.strategy ?? "n/a"} confidence=${match?.confidence ?? "n/a"} top_margin=${typeof topMargin === "number" ? topMargin.toFixed(3) : "n/a"} unmatched_reason=${match?.unmatchedReason ?? "none"}`
    );
    lines.push(
      `  what verified: params(spec=${specParamCount},sdk=${sdkParamCount},unknown=${unknownParamCount}), bag_param=${hasBagParam(method) ? "yes" : "no"}, request_body=${bodyCheck}, deprecation=${deprecationCheck}`
    );
  }

  return lines.length ? `${lines.join("\n")}\n` : "";
}

function toV1Compat(report: Awaited<ReturnType<typeof scanWithArtifacts>>["report"]) {
  return {
    version: "1",
    score: report.score,
    summary: {
      operationsTotal: report.summary.operationsTotal,
      operationsMatched: report.summary.operationsMatched,
      findingsTotal: report.summary.findingsTotal
    },
    deductions: report.deductions,
    findings: report.findings.map((finding) => ({
      id: finding.id,
      category: finding.category,
      severity: finding.severity,
      operationId: finding.operationId,
      sdkMethodId: finding.sdkMethodId,
      message: finding.message,
      remediation: finding.remediation
    }))
  };
}

run().catch((error) => {
  process.stderr.write(`SDKDrift CLI error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
