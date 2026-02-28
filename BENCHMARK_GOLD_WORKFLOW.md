# Benchmark Gold Workflow

## Review statuses
- `reviewed`: human-reviewed record
- `reviewed_auto`: auto-promoted record used for calibration/coverage monitoring
- `bootstrap`: seeded from benchmark reports, pending review

## Commands
```bash
npm run benchmark:gold:sync
npm run benchmark:gold:promote
npm run benchmark:run
```

## Recommended loop
1. Sync new findings into gold (`benchmark:gold:sync`).
2. Auto-promote low-risk bootstrap rows to maintain calibration coverage.
3. Replace `reviewed_auto` rows with `reviewed` rows during manual triage.
4. Run `benchmark:run` and keep all gates green.

## Gate intent
- `minGoldRecords`: broad sample coverage.
- `minReviewedRecordsTotal`: sufficient reviewed+auto-reviewed calibration volume.
- `minHumanReviewedRecords`: protects against full automation drift.
- `maxCalibrationEce` / `maxCalibrationBrier`: confidence quality bounds.
