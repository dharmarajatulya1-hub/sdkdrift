# SDKDrift Status

Last updated: 2026-02-19
Branch: `main`
Latest commit: `7de05eb`

## Completed
- Monorepo scaffold (`core`, `cli`, `python-scanner`, `landing`).
- CLI scan command with terminal/JSON/Markdown output.
- OpenAPI parsing with parameter/type extraction.
- Python AST scanner bridge.
- TypeScript scanner via `ts-morph`.
- Heuristic matcher + config overrides (`--config`).
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
- landing page scaffold: functional (placeholder backend persistence)

## Open Gaps (High Priority)
- No persistent waitlist storage yet (API route logs only).
- Matcher heuristics still basic; needs confidence tuning on real SDKs.
- No GitHub Action packaging yet.
- No unit-level test suite per module yet (currently fixture/e2e heavy).
- No release automation for npm publish yet.

## Next Steps (Ordered)
1. Hardening pass on matcher/diff
- Validate against real SDKs (Stripe/OpenAI/Twilio fixtures).
- Add false-positive/false-negative regression fixtures.
- Add confidence + strategy details in report output.

2. Config contract finalization
- Add schema validation for `sdkdrift.config.yaml`.
- Add clear CLI errors for invalid config.

3. Testing expansion
- Add module unit tests for parser, matcher, diff, scorer.
- Add TypeScript scanner edge-case tests.
- Add coverage threshold in CI.

4. Landing MVP completion
- Connect waitlist to real provider (Supabase/Formspree/ConvertKit).
- Add privacy/terms pages and SEO metadata.
- Add conversion event endpoint or analytics SDK.

5. Distribution readiness
- Add npm package publishing workflow.
- Add versioning/changelog process.
- Add GitHub Action wrapper package (`driftguard/action` equivalent for SDKDrift).

## Definition of "MVP Ready for External Beta"
- Scans Python + TypeScript SDKs with stable JSON output.
- CI workflow green on all pushes.
- Landing page deployed with working waitlist persistence.
- README includes install, usage, config, and troubleshooting.
