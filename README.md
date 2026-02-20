# SDKDrift

Never ship a stale SDK again.

SDKDrift detects drift between an OpenAPI spec and SDK surface, reports what changed, and outputs a score you can gate in CI.

## What It Solves
When your API spec evolves faster than generated SDKs, users hit missing methods, wrong params, and type mismatches. SDKDrift catches that before release.

If your SDK and spec are already perfectly in sync, this tool will be pleasantly boring. That is the goal.

## Packages
- `@sdkdrift/cli`: command-line interface
- `@sdkdrift/core`: parser, matcher, diff, scoring engine
- `@sdkdrift/python-scanner`: language scanner package (Python + TypeScript scanner entrypoints)

## Install
### One-off use
```bash
npx @sdkdrift/cli scan --help
```

### Project dependency
```bash
npm install --save-dev @sdkdrift/cli
```

## Quick Start
```bash
npx @sdkdrift/cli scan \
  --spec ./openapi.yaml \
  --sdk ./sdk/python \
  --lang python \
  --format terminal
```

## CLI Command
```bash
sdkdrift scan --spec <pathOrUrl> --sdk <path> --lang <python|ts> [options]
```

### Options
- `--spec <pathOrUrl>`: OpenAPI file path or URL
- `--sdk <path>`: SDK root directory
- `--lang <python|ts>`: language scanner
- `--format <terminal|json|markdown>`: output format (default `terminal`)
- `--config <path>`: config file path (`sdkdrift.config.yaml`)
- `--out <path>`: write report to file
- `--min-score <0..100>`: fail process when score is lower than threshold
- `--verbose`: emit matcher diagnostics to stderr

### Exit Codes
- `0`: success and score >= threshold
- `1`: runtime/config/parse error
- `2`: score below `--min-score`

## Config (`sdkdrift.config.yaml`)
```yaml
match:
  heuristicThreshold: 0.55
mapping:
  overrides:
    - operationId: listUsers
      sdkMethod: UsersApi.fetch_users
```

Validation rules are documented in `CONFIG_SPEC.md`.

## Output Examples
### Terminal
```text
SDKDrift Report
Score: 92/100
Operations: 1/2 matched
Findings: 1
- [high] missing_endpoint: Operation getUser is not represented in SDK
```

### JSON
```json
{
  "version": "1",
  "score": 92,
  "summary": {
    "operationsTotal": 2,
    "operationsMatched": 1,
    "findingsTotal": 1
  },
  "deductions": {
    "missing_endpoint": 8
  },
  "findings": [
    {
      "id": "missing_getUser",
      "category": "missing_endpoint",
      "severity": "high",
      "operationId": "getUser",
      "message": "Operation getUser is not represented in SDK"
    }
  ]
}
```

Contract stability is documented in `SCHEMA.md`.

## CI Usage
```yaml
name: SDK Drift Check
on: [push]
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @sdkdrift/cli scan --spec ./openapi.yaml --sdk ./sdk/python --lang python --min-score 90
```

## Repository Layout
- `packages/core`: parsing, matching, diffing, scoring
- `packages/cli`: command orchestration and output
- `packages/python-scanner`: scanner runtime
- `packages/landing`: marketing/waitlist site
- `fixtures`: fixture matrix for behavior validation
- `tests`: smoke and fixture test runner

## Docs Index
- `STATUS.md`: project execution status
- `SCHEMA.md`: JSON report contract
- `CONFIG_SPEC.md`: config contract
- `VALIDATION_REPORT.md`: latest validation summary
- `RELEASE.md`: release and publish guide
- `RELEASE_NOTES_v0.2.0.md`: release notes
- `packages/landing/README.md`: landing-specific env/setup docs

## Troubleshooting
- Config errors: validate `sdkdrift.config.yaml` against `CONFIG_SPEC.md`
- No CLI updates after changes: rebuild or reinstall package
- Waitlist failures: confirm Supabase env vars are set in Vercel project env vars
