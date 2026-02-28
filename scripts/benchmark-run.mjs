import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { evaluateGoldDataset } from "./benchmark-evaluate.mjs";

const root = process.cwd();

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  const manifestPath = path.join(root, "benchmark.manifest.json");
  const manifest = await readJson(manifestPath);
  const started = performance.now();

  const reportsByTarget = new Map();
  const targets = [];
  for (const target of manifest.targets ?? []) {
    const reportPath = path.join(root, target.reportFile);
    const report = await readJson(reportPath);
    reportsByTarget.set(target.name, report);

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

  const goldPath = path.join(root, manifest.goldDataset?.file ?? "validation/gold/labeled-operations.v1.json");
  const goldDataset = await readJson(goldPath);
  const goldEval = evaluateGoldDataset({
    reportsByTarget,
    goldDataset,
    includeBootstrap: manifest.goldDataset?.includeBootstrap !== false
  });

  const runtimeMs = Math.round(performance.now() - started);
  const avgActionableScore = targets.length
    ? Math.round(targets.reduce((acc, t) => acc + t.actionableScore, 0) / targets.length)
    : 0;

  const output = {
    version: 2,
    manifestVersion: manifest.version,
    generatedAt: new Date().toISOString(),
    runtimeMs,
    aggregate: {
      targets: targets.length,
      avgActionableScore
    },
    targets,
    goldEvaluation: goldEval
  };

  const gates = manifest.gates ?? {};
  const failures = [];

  const minActionableScore = gates.minActionableScore ?? 0;
  const lowActionable = targets.filter((target) => target.actionableScore < minActionableScore);
  if (lowActionable.length) {
    failures.push(`actionable score below ${minActionableScore} for ${lowActionable.map((t) => t.name).join(", ")}`);
  }

  const minGoldRecords = gates.minGoldRecords ?? 0;
  if (goldEval.recordsEvaluated < minGoldRecords) {
    failures.push(`gold records ${goldEval.recordsEvaluated} below minimum ${minGoldRecords}`);
  }

  const minReviewedGoldRecords = gates.minReviewedGoldRecords ?? 0;
  if (goldEval.reviewedRecords < minReviewedGoldRecords) {
    failures.push(`reviewed gold records ${goldEval.reviewedRecords} below minimum ${minReviewedGoldRecords}`);
  }

  const minReviewedRecordsTotal = gates.minReviewedRecordsTotal ?? 0;
  if (goldEval.reviewedRecords < minReviewedRecordsTotal) {
    failures.push(`total reviewed records ${goldEval.reviewedRecords} below minimum ${minReviewedRecordsTotal}`);
  }

  const minHumanReviewedRecords = gates.minHumanReviewedRecords ?? 0;
  if (goldEval.reviewedHumanRecords < minHumanReviewedRecords) {
    failures.push(`human reviewed records ${goldEval.reviewedHumanRecords} below minimum ${minHumanReviewedRecords}`);
  }

  const maxCalibrationEce = gates.maxCalibrationEce ?? 1;
  if (goldEval.metrics.calibrationEce > maxCalibrationEce) {
    failures.push(`calibration ECE ${goldEval.metrics.calibrationEce} exceeds ${maxCalibrationEce}`);
  }

  const maxCalibrationBrier = gates.maxCalibrationBrier ?? 1;
  if (goldEval.metrics.calibrationBrier > maxCalibrationBrier) {
    failures.push(`calibration Brier ${goldEval.metrics.calibrationBrier} exceeds ${maxCalibrationBrier}`);
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (failures.length) {
    process.stderr.write(`benchmark gate failed: ${failures.join("; ")}\n`);
    process.exit(2);
  }
}

main().catch((error) => {
  process.stderr.write(`benchmark run error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
