# CLI Smoke Test

Run after `npm run build`:

```bash
npm run smoke:cli
npm run smoke:cli:json
node ./packages/cli/dist/cli.js scan \
  --spec ./fixtures/simple/openapi.yaml \
  --sdk ./fixtures/simple/sdk/python \
  --lang python \
  --format terminal \
  --min-score 95
```

Expected behavior:
- `smoke:cli` succeeds and prints report.
- `smoke:cli:json` writes `tests/smoke-report.json`.
- `--min-score 95` exits with code `2` (threshold violation).
