# SDKDrift v0.2.0

Release date: 2026-02-20

## Highlights
- Published npm packages:
  - `@sdkdrift/core`
  - `@sdkdrift/python-scanner`
  - `@sdkdrift/cli`
- TypeScript scanning support via `ts-morph`.
- Heuristic matcher improvements for nested/plural resource naming.
- Config validation and overrides through `sdkdrift.config.yaml`.
- Verbose diagnostics mode (`--verbose`) for matcher strategy insight.
- Expanded fixture matrix and CI smoke checks.
- Landing page readiness improvements (provider-backed waitlist, legal pages, metadata).

## CLI Quickstart
```bash
npx @sdkdrift/cli scan --help
```

## Notes
- Use `--min-score` to gate CI.
- Use `--config` for explicit operation-to-method overrides.
