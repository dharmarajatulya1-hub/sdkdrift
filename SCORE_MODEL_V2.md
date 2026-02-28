# Score Model v2

## Overview
SDKDrift v2 exposes dual scores:
- `scores.actionable`: release-risk drift signal
- `scores.coverage`: SDK surface-coverage signal

`score` is retained as an aggregate compatibility score.

## Inputs
- Findings list with category labels.
- Weighted category map in `packages/core/src/scoring/score.ts`.
- Spec-size normalization factor: `max(1, operationsTotal / 10)`.

## Calculation
1. Count findings per category.
2. Compute weighted impact per category.
3. Normalize total impact by spec-size factor.
4. Produce aggregate score: `max(0, round(100 - normalizedImpact))`.
5. Compute actionable and coverage sub-scores from category subsets.

## Actionable Categories
- `missing_endpoint`
- `required_field_added`
- `changed_param`
- `type_mismatch`
- `deprecated_mismatch`

## Coverage Categories
- `unsupported_resource`
- `param_not_explicit`
- `extra_sdk_method`

## Notes
- v2 keeps `deductions`/`weightedDeductions` for migration stability.
- v2 adds `categoryCounts`/`weightedImpact` as clearer semantics.
- Calibration quality is tracked in benchmark output using ECE and Brier score from gold-labeled records.
