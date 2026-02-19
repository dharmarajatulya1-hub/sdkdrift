#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { renderReport, scanWithArtifacts } from "@sdkdrift/core";
import type { MatchOptions } from "@sdkdrift/core";
import { scanPythonSdk, scanTypeScriptSdk } from "@sdkdrift/python-scanner";
import { load } from "js-yaml";

type RawConfig = {
  mapping?: {
    overrides?: Array<{ operationId?: string; sdkMethod?: string }>;
  };
  match?: {
    heuristicThreshold?: number;
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
  if (typeof raw.match?.heuristicThreshold !== "undefined") {
    const threshold = raw.match.heuristicThreshold;
    if (typeof threshold !== "number" || Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error(`Invalid config at ${configPath}: match.heuristicThreshold must be a number between 0 and 1`);
    }
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

  return raw;
}

async function loadMatchOptions(configPath?: string): Promise<MatchOptions | undefined> {
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

  const options: MatchOptions = {};
  if (Object.keys(overrides).length > 0) {
    options.overrides = overrides;
  }
  if (typeof config.match?.heuristicThreshold === "number") {
    options.heuristicThreshold = config.match.heuristicThreshold;
  }
  return Object.keys(options).length > 0 ? options : undefined;
}

async function run(): Promise<number> {
  const program = new Command();

  program
    .name("sdkdrift")
    .description("Detect drift between OpenAPI specs and SDK surfaces")
    .version("0.1.0");

  program
    .command("scan")
    .requiredOption("--spec <pathOrUrl>", "OpenAPI file path or URL")
    .requiredOption("--sdk <path>", "SDK root directory")
    .requiredOption("--lang <python|ts>", "SDK language")
    .option("--format <terminal|json|markdown>", "Report output format", "terminal")
    .option("--verbose", "Print matcher diagnostics to stderr", false)
    .option("--config <path>", "Path to sdkdrift.config.yaml")
    .option("--out <path>", "Write output to file path")
    .option("--min-score <number>", "Fail if score is below threshold", (v) => Number(v))
    .action(async (args) => {
      const lang = args.lang as "python" | "ts";
      const matchOptions = await loadMatchOptions(args.config as string | undefined);
      const methods =
        lang === "python" ? await scanPythonSdk(args.sdk as string) : await scanTypeScriptSdk(args.sdk as string);

      const artifacts = await scanWithArtifacts(
        {
          specPathOrUrl: args.spec as string,
          sdkPath: args.sdk as string,
          language: lang,
          minScore: args.minScore as number | undefined,
          match: matchOptions
        },
        methods
      );
      const { report, matches } = artifacts;

      const format = (args.format as "terminal" | "json" | "markdown") ?? "terminal";
      const output = renderReport(report, format);

      if (args.out) {
        await writeFile(args.out as string, output, "utf8");
      } else {
        process.stdout.write(`${output}\n`);
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
      }

      if (typeof args.minScore === "number" && report.score < args.minScore) {
        process.exitCode = 2;
      }
    });

  await program.parseAsync(process.argv);
  return typeof process.exitCode === "number" ? process.exitCode : 0;
}

run().catch((error) => {
  process.stderr.write(`SDKDrift CLI error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
