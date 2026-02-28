import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function keyFor(record) {
  return `${record.target}::${record.operationId}`;
}

async function main() {
  const manifest = await readJson(path.join(root, "benchmark.manifest.json"));
  const goldPath = path.join(root, manifest.goldDataset?.file ?? "benchmark/gold/labeled-operations.v1.json");
  const gold = await readJson(goldPath);

  const existing = new Map();
  for (const record of gold.records ?? []) {
    if (!record?.target || !record?.operationId) continue;
    existing.set(keyFor(record), record);
  }

  for (const target of manifest.targets ?? []) {
    const report = await readJson(path.join(root, target.reportFile));
    const byOperation = new Map();
    for (const finding of report.findings ?? []) {
      if (!finding.operationId) continue;
      if (!byOperation.has(finding.operationId)) byOperation.set(finding.operationId, []);
      byOperation.get(finding.operationId).push(finding);
    }

    for (const [operationId, findings] of byOperation.entries()) {
      const categories = [...new Set(findings.map((finding) => finding.category))].sort();
      const hasUnmappedCategory = categories.includes("missing_endpoint") || categories.includes("unsupported_resource");
      const maxConfidence = findings.reduce((acc, finding) => {
        const confidence = typeof finding.confidence === "number" ? finding.confidence : 0;
        return Math.max(acc, confidence);
      }, 0);

      const recordKey = `${target.name}::${operationId}`;
      if (existing.has(recordKey)) continue;

      existing.set(recordKey, {
        id: recordKey,
        target: target.name,
        operationId,
        reviewStatus: "bootstrap",
        expected: {
          mapped: !hasUnmappedCategory,
          findingCategories: categories
        },
        signals: {
          maxFindingConfidence: Number(maxConfidence.toFixed(3)),
          findingCount: findings.length
        },
        note: "Bootstrapped from benchmark report; requires review."
      });
    }
  }

  const records = [...existing.values()].sort((a, b) => {
    if (a.target !== b.target) return String(a.target).localeCompare(String(b.target));
    return String(a.operationId).localeCompare(String(b.operationId));
  });

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    description:
      "Gold labels for benchmark evaluation. reviewed=human-reviewed, reviewed_auto=auto-promoted with strict rules, bootstrap=needs review.",
    records
  };

  await writeFile(goldPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  const counts = records.reduce(
    (acc, record) => {
      acc.total += 1;
      const status = record.reviewStatus ?? "unknown";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    { total: 0 }
  );
  process.stdout.write(`${JSON.stringify({ goldPath, counts }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`gold sync error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
