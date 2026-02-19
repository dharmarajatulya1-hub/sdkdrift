# SDKDrift Status

Last updated: 2026-02-19
Branch: `main`
Latest commit: `0a1f192`

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
- CI workflow (`build`, fixture tests, smoke test).
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

## Current MVP State
- `python` scan path: functional
- `ts` scan path: functional
- score + threshold exit code: functional
- config overrides (`sdkdrift.config.yaml`): functional
- config schema validation: functional
- landing page: functional with provider-based waitlist persistence support

## In Progress (Current Milestone)
1. Distribution readiness
- [x] Add release dry-run workflow (`npm pack` artifacts)
- [x] Add release guide (`RELEASE.md`)
- [x] Expand README usage + troubleshooting
- [ ] Commit and push milestone

## Remaining Sprint Milestones
1. CI quality gate extension (extra smoke path)
2. Final MVP checklist sign-off

## Definition of "MVP Ready for External Beta"
- Scans Python + TypeScript SDKs with stable JSON output.
- CI workflow green on all pushes.
- Landing page deployed with working waitlist persistence.
- README includes install, usage, config, and troubleshooting.
