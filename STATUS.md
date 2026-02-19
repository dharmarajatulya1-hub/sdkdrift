# SDKDrift Status

Last updated: 2026-02-19
Branch: `main`
Latest commit: `021dbc2`

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

## Current MVP State
- `python` scan path: functional
- `ts` scan path: functional
- score + threshold exit code: functional
- config overrides (`sdkdrift.config.yaml`): functional
- config schema validation: functional
- landing page scaffold: functional (provider wiring pending)

## In Progress (Current Milestone)
1. Public contract lock
- [x] Add report output contract doc (`SCHEMA.md`)
- [x] Add config contract doc (`CONFIG_SPEC.md`)
- [ ] Commit and push milestone

## Remaining Sprint Milestones
1. Real-world validation pass (additional fixtures + report)
2. CLI usability polish (`--verbose` diagnostics)
3. Landing production readiness (real waitlist persistence + legal/SEO)
4. Distribution readiness (npm release workflow + docs)
5. CI quality gate extension (extra smoke path)

## Definition of "MVP Ready for External Beta"
- Scans Python + TypeScript SDKs with stable JSON output.
- CI workflow green on all pushes.
- Landing page deployed with working waitlist persistence.
- README includes install, usage, config, and troubleshooting.
