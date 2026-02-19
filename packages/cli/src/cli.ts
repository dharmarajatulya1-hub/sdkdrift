#!/usr/bin/env node
import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { renderReport, scanWithMethods } from "@sdkdrift/core";
import { scanPythonSdk, scanTypeScriptSdk } from "@sdkdrift/python-scanner";

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
    .option("--out <path>", "Write output to file path")
    .option("--min-score <number>", "Fail if score is below threshold", (v) => Number(v))
    .action(async (args) => {
      const lang = args.lang as "python" | "ts";
      const methods =
        lang === "python" ? await scanPythonSdk(args.sdk as string) : await scanTypeScriptSdk(args.sdk as string);

      const report = await scanWithMethods(
        {
          specPathOrUrl: args.spec as string,
          sdkPath: args.sdk as string,
          language: lang,
          minScore: args.minScore as number | undefined
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
