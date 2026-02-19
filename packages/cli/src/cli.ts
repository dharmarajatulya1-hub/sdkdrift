#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { renderReport, scanWithMethods } from "@sdkdrift/core";
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

async function loadMatchOptions(configPath?: string): Promise<MatchOptions | undefined> {
  if (!configPath) return undefined;
  const content = await readFile(configPath, "utf8");
  const config = (load(content) ?? {}) as RawConfig;
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
    .option("--config <path>", "Path to sdkdrift.config.yaml")
    .option("--out <path>", "Write output to file path")
    .option("--min-score <number>", "Fail if score is below threshold", (v) => Number(v))
    .action(async (args) => {
      const lang = args.lang as "python" | "ts";
      const matchOptions = await loadMatchOptions(args.config as string | undefined);
      const methods =
        lang === "python" ? await scanPythonSdk(args.sdk as string) : await scanTypeScriptSdk(args.sdk as string);

      const report = await scanWithMethods(
        {
          specPathOrUrl: args.spec as string,
          sdkPath: args.sdk as string,
          language: lang,
          minScore: args.minScore as number | undefined,
          match: matchOptions
        },
        methods
      );

      const format = (args.format as "terminal" | "json" | "markdown") ?? "terminal";
      const output = renderReport(report, format);

      if (args.out) {
        await writeFile(args.out as string, output, "utf8");
      } else {
        process.stdout.write(`${output}\n`);
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
