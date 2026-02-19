# SDKDrift

Never ship a stale SDK again.

SDKDrift detects drift between an OpenAPI spec and generated SDK code, reports the mismatch, and returns a CI-friendly score.

## Current MVP
- OpenAPI parsing (core)
- Python SDK surface scan (AST bridge)
- CLI scan command with terminal/JSON/Markdown output
- Drift score and threshold exit codes

## Quick Start
```bash
npm install
npm run build
npm run smoke:cli
```

## CLI Example
```bash
node ./packages/cli/dist/cli.js scan \
  --spec ./fixtures/simple/openapi.yaml \
  --sdk ./fixtures/simple/sdk/python \
  --lang python \
  --format terminal
```

## Config Example
```yaml
# sdkdrift.config.yaml
match:
  heuristicThreshold: 0.55
mapping:
  overrides:
    - operationId: listUsers
      sdkMethod: UsersApi.fetch_users
```

```bash
node ./packages/cli/dist/cli.js scan \
  --spec ./fixtures/cases/override/openapi.yaml \
  --sdk ./fixtures/cases/override/sdk/python \
  --lang python \
  --config ./fixtures/cases/override/sdkdrift.config.yaml \
  --format json
```

## Verbose Diagnostics
```bash
node ./packages/cli/dist/cli.js scan \
  --verbose \
  --spec ./fixtures/simple/openapi.yaml \
  --sdk ./fixtures/simple/sdk/python \
  --lang python \
  --format json
```

Verbose diagnostics are written to stderr and include strategy counts and unmatched operation IDs.

## Repository Layout
- `packages/core` shared parsing, matching, diffing, scoring, reporting
- `packages/cli` CLI command wrapper
- `packages/python-scanner` Python AST scanner bridge
- `packages/landing` landing-page app scaffold
- `fixtures` local scan fixtures
- `tests` smoke and integration test assets

## Project Status
- Current execution tracker: `STATUS.md`
- JSON contract: `SCHEMA.md`
- Config contract: `CONFIG_SPEC.md`
- Validation snapshot: `VALIDATION_REPORT.md`
- Release process: `RELEASE.md`

## Near-Term Roadmap
1. Implement TypeScript SDK scanning with `ts-morph`
2. Improve matcher heuristics and override mappings
3. Add fixture matrix and automated tests
4. Build landing page MVP (waitlist-first)

## Landing Env Vars
- `WAITLIST_WEBHOOK_URL` required for waitlist submissions.
- `WAITLIST_PROVIDER` optional (`formspree` or `generic`).
- `NEXT_PUBLIC_SITE_URL` optional canonical URL for metadata.

## Troubleshooting
- `Invalid config`: validate against `CONFIG_SPEC.md`.
- `Unknown option` errors: ensure CLI was rebuilt (`npm run build`) after updates.
- Missing waitlist submissions: verify `WAITLIST_WEBHOOK_URL` is set in Vercel.
