# SDKDrift v2 Migration Guide

## Breaking Default
JSON reports now emit `version: "2"` by default.

## New Fields
- `scores.actionable`
- `scores.coverage`
- `categoryCounts`
- `weightedImpact`
- enriched finding metadata (`ruleId`, `isActionable`, `evidence`)

## Compatibility Mode
Use:

```bash
sdkdrift scan ... --format json --compat-v1
```

This emits a reduced v1-compatible schema (`version: "1"`) for legacy consumers.

## Config Additions
- `match.mode`
- `match.minConfidenceActionable`
- `match.minTop2Margin`
- `match.abstainOverGuess`
- `diff.ignore.extraMethods[]`

## Recommended Rollout
1. Start with `--compat-v1` in CI.
2. Validate v2 reports in parallel for one release cycle.
3. Switch gates to `scores.actionable`.
