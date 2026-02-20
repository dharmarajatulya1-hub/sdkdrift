import type { DriftCategory, DriftFinding, DriftReport } from "../types/contracts.js";

const weights: Record<DriftCategory, number> = {
  missing_endpoint: 8,
  unsupported_resource: 4,
  required_field_added: 5,
  type_mismatch: 3,
  changed_param: 3,
  deprecated_mismatch: 2,
  extra_sdk_method: 1
};

export function scoreReport(
  findings: DriftFinding[],
  operationsTotal: number,
  operationsMatched: number
): Pick<DriftReport, "score" | "deductions" | "summary"> {
  const counts: Partial<Record<DriftCategory, number>> = {};
  const deductions: Partial<Record<DriftCategory, number>> = {};

  for (const finding of findings) {
    counts[finding.category] = (counts[finding.category] ?? 0) + 1;
  }

  const unmatchedOps = Math.max(0, operationsTotal - operationsMatched);
  for (const [category, count] of Object.entries(counts) as Array<[DriftCategory, number]>) {
    const cappedCount =
      category === "missing_endpoint" || category === "unsupported_resource"
        ? Math.min(count, unmatchedOps)
        : count;
    deductions[category] = cappedCount * weights[category];
  }

  const totalDeduction = Object.values(deductions).reduce((acc, v) => acc + (v ?? 0), 0);
  // Normalize deduction by spec size so large real-world APIs do not saturate to 0 immediately.
  const normalizationFactor = Math.max(1, operationsTotal / 10);
  const normalizedDeduction = totalDeduction / normalizationFactor;
  const score = Math.max(0, Math.round(100 - normalizedDeduction));

  return {
    score,
    deductions,
    summary: {
      operationsTotal,
      operationsMatched,
      findingsTotal: findings.length
    }
  };
}
