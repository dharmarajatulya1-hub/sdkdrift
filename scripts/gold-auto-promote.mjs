import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function actionableOnly(categories) {
  const actionable = new Set(["missing_endpoint", "required_field_added", "changed_param", "type_mismatch", "deprecated_mismatch"]);
  return categories.some((category) => actionable.has(category));
}

async function main() {
  const desiredReviewedTotal = Number(process.env.GOLD_PROMOTE_TARGET ?? 150);
  const maxConfidence = Number(process.env.GOLD_PROMOTE_MAX_CONFIDENCE ?? 0.65);

  const manifest = await readJson(path.join(root, "benchmark.manifest.json"));
  const goldPath = path.join(root, manifest.goldDataset?.file ?? "benchmark/gold/labeled-operations.v1.json");
  const gold = await readJson(goldPath);
  const records = [...(gold.records ?? [])];

  const reviewedHuman = records.filter((record) => record.reviewStatus === "reviewed").length;
  const reviewedAutoCurrent = records.filter((record) => record.reviewStatus === "reviewed_auto").length;
  const currentReviewedTotal = reviewedHuman + reviewedAutoCurrent;
  const need = Math.max(0, desiredReviewedTotal - currentReviewedTotal);

  if (need === 0) {
    process.stdout.write(JSON.stringify({ promoted: 0, reviewedHuman, reviewedAutoCurrent, reviewedTotal: currentReviewedTotal }, null, 2) + "\n");
    return;
  }

  const candidates = records
    .filter((record) => record.reviewStatus === "bootstrap")
    .filter((record) => {
      const categories = record.expected?.findingCategories ?? [];
      // Prefer lower-confidence and non-actionable-only rows for auto promotion.
      return (record.signals?.maxFindingConfidence ?? 1) <= maxConfidence || !actionableOnly(categories);
    })
    .sort((a, b) => {
      const ac = a.signals?.maxFindingConfidence ?? 1;
      const bc = b.signals?.maxFindingConfidence ?? 1;
      if (ac !== bc) return ac - bc;
      const af = a.signals?.findingCount ?? 0;
      const bf = b.signals?.findingCount ?? 0;
      return af - bf;
    });

  const selected = candidates.slice(0, need);
  const selectedIds = new Set(selected.map((record) => record.id ?? `${record.target}::${record.operationId}`));

  const promotedAt = new Date().toISOString();
  const updatedRecords = records.map((record) => {
    const id = record.id ?? `${record.target}::${record.operationId}`;
    if (!selectedIds.has(id)) return record;
    return {
      ...record,
      id,
      reviewStatus: "reviewed_auto",
      reviewMeta: {
        promotedBy: "gold-auto-promote",
        promotedAt,
        rationale: `Auto-promoted for calibration coverage (maxFindingConfidence<=${maxConfidence} or non-actionable-only category set).`
      }
    };
  });

  const output = {
    ...gold,
    records: updatedRecords,
    generatedAt: promotedAt
  };

  await writeFile(goldPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const reviewedAuto = updatedRecords.filter((record) => record.reviewStatus === "reviewed_auto").length;
  const reviewedTotal = reviewedAuto + reviewedHuman;
  process.stdout.write(
    JSON.stringify(
      {
        promoted: selected.length,
        reviewedHuman,
        reviewedAuto,
        reviewedTotal,
        desiredReviewedTotal
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  process.stderr.write(`gold auto-promote error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
