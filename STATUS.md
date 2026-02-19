# SDKDrift Status

Last updated: 2026-02-19
Branch: `main`
Latest commit: `9a20ac1`

## Sprint: Final MVP Completion
Tracking mode: small sequential commits with validation after each milestone.

## Completed
- Monorepo scaffold (`core`, `cli`, `python-scanner`, `landing`).
- CLI scan command with terminal/JSON/Markdown output.
- OpenAPI parsing with parameter/type extraction.
- Python AST scanner bridge.
- TypeScript scanner via `ts-morph`.
- Heuristic matcher + config overrides (`--config`).
- Config validation with actionable CLI errors.
- Diff categories implemented:
  - `missing_endpoint`
  - `required_field_added`
  - `type_mismatch`
  - `changed_param`
  - `extra_sdk_method`
- Fixture matrix + automated fixture test runner.
- Next.js landing scaffold with waitlist-first CTA and event hooks.
- CI workflow with build + fixture tests + multi-path smoke checks.
- Public contracts:
  - `SCHEMA.md`
  - `CONFIG_SPEC.md`
- Validation snapshot: `VALIDATION_REPORT.md`
- CLI usability polish:
  - `--verbose` matcher diagnostics to stderr.
- Landing readiness:
  - provider-backed waitlist API
  - `/privacy` and `/terms` pages
  - metadata/SEO base config
- Distribution readiness:
  - release dry-run workflow (`npm pack` artifacts)
  - release guide (`RELEASE.md`)

## Current MVP State
- `python` scan path: functional
- `ts` scan path: functional
- score + threshold exit code: functional
- config overrides (`sdkdrift.config.yaml`): functional
- config schema validation: functional
- landing page: functional with provider-based waitlist persistence support

## In Progress (Current Milestone)
1. CI quality gate extension
- [x] Add TypeScript smoke script
- [x] Add override smoke script
- [x] Run both smoke paths locally
- [ ] Commit and push milestone

## Final MVP Sign-off Checklist
- [x] Contracts documented and versioned
- [x] Core scan behavior validated on expanded fixture suite
- [x] CLI diagnostics and threshold behavior verified
- [x] Landing page deployed with configurable waitlist backend
- [x] CI validates build + fixtures + smoke paths
- [x] Release dry-run workflow exists

## Remaining for Public NPM Release (post-MVP)
- Align `package-lock.json` Next.js resolution to patched version in current environment.
- Finalize publish strategy for local file-based monorepo dependencies.
