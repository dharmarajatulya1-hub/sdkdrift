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

## Near-Term Roadmap
1. Implement TypeScript SDK scanning with `ts-morph`
2. Improve matcher heuristics and override mappings
3. Add fixture matrix and automated tests
4. Build landing page MVP (waitlist-first)
