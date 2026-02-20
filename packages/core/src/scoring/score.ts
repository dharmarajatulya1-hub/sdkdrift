import type { DriftCategory, DriftFinding, DriftReport } from "../types/contracts.js";

const weights: Record<DriftCategory, number> = {
  missing_endpoint: 8,
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
  const deductions: Partial<Record<DriftCategory, number>> = {};

  for (const finding of findings) {
    deductions[finding.category] = (deductions[finding.category] ?? 0) + weights[finding.category];
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
