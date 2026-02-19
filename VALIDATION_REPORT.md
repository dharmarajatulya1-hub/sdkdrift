# SDKDrift MVP Validation Report

Date: 2026-02-19
Scope: CLI core matching/diff behavior on MVP fixture matrix.

## Summary
- Build status: pass
- Fixture suite: pass
- Languages validated: Python, TypeScript
- Config validation: pass (invalid schema case returns exit 1)

## Validation Matrix
- `missing-endpoint`: pass (`missing_endpoint`)
- `required-param`: pass (`required_field_added`)
- `type-mismatch`: pass (`type_mismatch`)
- `override`: pass (score `100` with explicit mapping)
- `ts-basic`: pass (score `100`)
- `heuristic-nested`: pass (nested resource matched heuristically)
- `optional-param`: pass (`changed_param`)
- `threshold-exit`: pass (CLI exits with code `2`)
- `invalid-config`: pass (clear validation error, exit code `1`)

## Confidence Notes
- Heuristic matching now handles:
  - plural/singular token normalization
  - nested resource path tokens
  - method-verb signal boosting
- Type mismatch normalization now handles common aliases (`str|string`, `integer|int|number`).

## Known Limits
- No direct scans yet against large external SDK repos in CI.
- Heuristic threshold may still require per-project tuning.
- Type normalization is alias-based and not full semantic typing.

## Recommendation
MVP is acceptable for external beta with clear docs on:
- config overrides for ambiguous mappings
- known matcher limits and threshold tuning
