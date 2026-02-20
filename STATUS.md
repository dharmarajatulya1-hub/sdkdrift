# SDKDrift Status

Last updated: 2026-02-20
Branch: `main`
Latest commit: `c8f8226` (report classification hardening in working tree)

## Current Focus
Launch readiness pass.

## Completed
- Published npm packages under `@sdkdrift` scope.
- Waitlist in production backed by Supabase.
- README rewritten with CLI options, examples, CI usage, and output samples.
- Landing messaging and design refreshed with glassmorphism styling.
- Release notes and `v0.2.0` tag published.

## In Progress
1. Launch Readiness Pass
- [x] Landing form UX tweaks (`Email` placeholder, improved errors)
- [x] Launch readiness doc created (`LAUNCH_READINESS.md`)
- [x] Real-world validation helper script added (`scripts/real-world-validation.sh`)
- [x] Execute external-repo validation and capture findings in `validation/real-world/`
- [x] Apply targeted false-positive reductions (matcher + diff + scanner filters)
- [x] Add regression fixtures for param casing + Python `Annotated[...]` handling
- [x] Add regression fixtures for verb aliases (`modify`) and action disambiguation (`cancel`)
- [x] Add scanner ID hygiene (path-qualified method IDs) + wrapper exclusion
- [x] Add scoring normalization to avoid large-spec score saturation
- [x] Add unmatched-reason counters in report summary (`no_matching_resource_in_sdk`, etc.)
- [x] Add second-pass path+method fallback matcher for unmatched operations
- [x] Split report output into `actionableFindings` and `coverageNotes` (while keeping `findings` for compatibility)
- [ ] Complete Stripe Node real-world parsing support (`StripeResource.extend(...)` pattern)

## Validation Snapshot (baseline -> post2)
- `ory-kratos-python`: findings `909 -> 170` (81.3% reduction), matched `56/56 -> 56/56`
- `ory-kratos-ts`: findings `98 -> 1` (99.0% reduction), score `0 -> 99`
- `stripe-python`: findings `1900 -> 1595` (16.1% reduction), matched `131/534 -> 153/534`
- `stripe-node-ts`: findings `625 -> 603` (3.5% reduction), matched `0/534 -> 0/534` (still blocked by scanner pattern gap)

## OpenAI Snapshot (baseline -> latest local run)
- `openai-python` against `openapi.documented.yml`:
  - matched `93/237 -> 150/237`
  - findings `646 -> 281` (56.5% reduction)
  - category deltas:
    - `missing_endpoint`: `144 -> 23`
    - `unsupported_resource`: `0 -> 64` (reclassified informational coverage)
    - `extra_sdk_method`: `446 -> 164`
    - `type_mismatch`: `31 -> 0`
    - `required_field_added`: `17 -> 16`
    - `changed_param`: `8 -> 14` (small increase from tighter method routing)
  - score changed from `0 -> 69` after normalization + reclassification
  - new summary diagnostics:
    - `actionableFindingsTotal`: `53`
    - `coverageNotesTotal`: `228`
    - `unmatchedReasons`: `no_matching_resource_in_sdk=50`, `no_matching_action_in_resource=25`, `path_based_match_available=12`

## Verification Checks Run
- `npm run build`
- `npm run test:fixtures` (all fixture cases pass, including new regressions)
- `npm run smoke:cli`
- `npm run smoke:cli:ts`
- Ory regression checks after matcher/report changes:
  - `ory-kratos-ts`: stable at `56/56` matched, score `100`
  - `ory-kratos-python`: stable at `56/56` matched, score `49`

## Next
- Add TS scanner support for generated SDK object-literal resources (Stripe Node pattern).
- Add targeted OpenAI matcher improvements for org/admin hyphenated operation IDs (`list-project-*`, `admin-*`) to reduce remaining unmatched operations.
- Re-run `stripe-node-ts` real-world validation and confirm operation matches increase from `0`.
- Classify remaining Ory/Stripe findings into true drift vs residual scanner limitations.
- Promote stable validation commands into CI (non-blocking matrix first, then required checks).
