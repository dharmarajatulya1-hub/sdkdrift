import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";

const root = process.cwd();

async function main() {
  const manifestPath = path.join(root, "benchmark.manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const started = performance.now();

  const targets = [];
  for (const target of manifest.targets ?? []) {
    const reportPath = path.join(root, target.reportFile);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    const summary = report.summary ?? {};
    const findings = report.findings ?? [];
    const actionable = findings.filter((finding) =>
      ["missing_endpoint", "changed_param", "required_field_added", "type_mismatch", "deprecated_mismatch"].includes(finding.category)
    );

    targets.push({
      name: target.name,
      score: report.score,
      actionableScore: report.scores?.actionable ?? report.score,
      coverageScore: report.scores?.coverage ?? report.score,
      operationsMatched: summary.operationsMatched ?? 0,
      operationsTotal: summary.operationsTotal ?? 0,
      findingsTotal: summary.findingsTotal ?? findings.length,
      actionableFindings: actionable.length,
      unmatchedReasons: summary.unmatchedReasons ?? {}
    });
  }

  const runtimeMs = Math.round(performance.now() - started);
  const avgActionableScore = targets.length
    ? Math.round(targets.reduce((acc, t) => acc + t.actionableScore, 0) / targets.length)
    : 0;

  const output = {
    version: 1,
    manifestVersion: manifest.version,
    generatedAt: new Date().toISOString(),
    runtimeMs,
    aggregate: {
      targets: targets.length,
      avgActionableScore
    },
    targets
  };

  const minActionableScore = manifest.gates?.minActionableScore ?? 0;
  const bad = targets.filter((target) => target.actionableScore < minActionableScore);

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (bad.length) {
    process.stderr.write(`benchmark gate failed: actionable score below ${minActionableScore} for ${bad.map((t) => t.name).join(", ")}\n`);
    process.exit(2);
  }
}

main().catch((error) => {
  process.stderr.write(`benchmark run error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
