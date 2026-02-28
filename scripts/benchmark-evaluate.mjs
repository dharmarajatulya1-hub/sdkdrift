function asNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function calculateEce(samples, bins = 10) {
  if (!samples.length) return 0;
  const bucketSize = 1 / bins;
  let weighted = 0;
  for (let i = 0; i < bins; i += 1) {
    const lo = i * bucketSize;
    const hi = i === bins - 1 ? 1.0000001 : (i + 1) * bucketSize;
    const bucket = samples.filter((sample) => sample.prob >= lo && sample.prob < hi);
    if (!bucket.length) continue;
    const avgProb = bucket.reduce((acc, sample) => acc + sample.prob, 0) / bucket.length;
    const avgLabel = bucket.reduce((acc, sample) => acc + sample.label, 0) / bucket.length;
    weighted += (bucket.length / samples.length) * Math.abs(avgProb - avgLabel);
  }
  return Number(weighted.toFixed(4));
}

function calculateBrier(samples) {
  if (!samples.length) return 0;
  const value =
    samples.reduce((acc, sample) => {
      const diff = sample.prob - sample.label;
      return acc + diff * diff;
    }, 0) / samples.length;
  return Number(value.toFixed(4));
}

function findingCategoriesByOperation(report) {
  const map = new Map();
  for (const finding of report.findings ?? []) {
    if (!finding.operationId) continue;
    if (!map.has(finding.operationId)) {
      map.set(finding.operationId, []);
    }
    map.get(finding.operationId).push(finding);
  }
  return map;
}

export function evaluateGoldDataset({ reportsByTarget, goldDataset, includeBootstrap = true }) {
  const records = (goldDataset?.records ?? []).filter((record) => {
    if (!record || typeof record !== "object") return false;
    if (record.reviewStatus === "bootstrap" && !includeBootstrap) return false;
    return true;
  });

  const perTarget = new Map();
  const calibrationSamples = [];
  let tp = 0;
  let fp = 0;
  let fn = 0;

  for (const record of records) {
    const target = record.target;
    const operationId = record.operationId;
    if (typeof target !== "string" || typeof operationId !== "string") continue;
    const report = reportsByTarget.get(target);
    if (!report) continue;

    const opFindings = findingCategoriesByOperation(report).get(operationId) ?? [];
    const expectedCategories = new Set(record.expected?.findingCategories ?? []);
    const predictedCategories = new Set(opFindings.map((finding) => finding.category));

    const targetStats = perTarget.get(target) ?? { tp: 0, fp: 0, fn: 0, records: 0 };
    targetStats.records += 1;

    for (const category of expectedCategories) {
      const hit = opFindings
        .filter((finding) => finding.category === category)
        .sort((a, b) => asNumber(b.confidence, 0) - asNumber(a.confidence, 0))[0];
      if (hit) {
        tp += 1;
        targetStats.tp += 1;
      } else {
        fn += 1;
        targetStats.fn += 1;
      }
      calibrationSamples.push({
        prob: clamp01(asNumber(hit?.confidence, 0)),
        label: hit ? 1 : 0
      });
    }

    for (const finding of opFindings) {
      if (expectedCategories.has(finding.category)) continue;
      fp += 1;
      targetStats.fp += 1;
      calibrationSamples.push({
        prob: clamp01(asNumber(finding.confidence, 0.5)),
        label: 0
      });
    }

    // Mapping signal calibration derived from missing/unsupported endpoint evidence.
    if (typeof record.expected?.mapped === "boolean") {
      const unmappedFinding = opFindings
        .filter((finding) => finding.category === "missing_endpoint" || finding.category === "unsupported_resource")
        .sort((a, b) => asNumber(b.confidence, 0) - asNumber(a.confidence, 0))[0];
      const pMapped = unmappedFinding ? 1 - clamp01(asNumber(unmappedFinding.confidence, 0.5)) : 1;
      calibrationSamples.push({
        prob: pMapped,
        label: record.expected.mapped ? 1 : 0
      });
    }

    perTarget.set(target, targetStats);
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const ece = calculateEce(calibrationSamples, 10);
  const brier = calculateBrier(calibrationSamples);

  const reviewedRecords = records.filter((record) => record.reviewStatus === "reviewed").length;
  const bootstrapRecords = records.filter((record) => record.reviewStatus === "bootstrap").length;

  return {
    version: 1,
    recordsEvaluated: records.length,
    reviewedRecords,
    bootstrapRecords,
    metrics: {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
      calibrationEce: ece,
      calibrationBrier: brier,
      calibrationSamples: calibrationSamples.length
    },
    targets: [...perTarget.entries()].map(([name, stats]) => ({
      name,
      records: stats.records,
      precision: Number((stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 1).toFixed(4)),
      recall: Number((stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 1).toFixed(4))
    }))
  };
}
