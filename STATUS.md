# SDKDrift Status

Last updated: 2026-02-20
Branch: `main`
Latest commit: `f3b450e` (validation hardening in working tree, not committed yet)

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
- [ ] Complete Stripe Node real-world parsing support (`StripeResource.extend(...)` pattern)

## Validation Snapshot (baseline -> post2)
- `ory-kratos-python`: findings `909 -> 170` (81.3% reduction), matched `56/56 -> 56/56`
- `ory-kratos-ts`: findings `98 -> 1` (99.0% reduction), score `0 -> 99`
- `stripe-python`: findings `1900 -> 1595` (16.1% reduction), matched `131/534 -> 153/534`
- `stripe-node-ts`: findings `625 -> 603` (3.5% reduction), matched `0/534 -> 0/534` (still blocked by scanner pattern gap)

## Verification Checks Run
- `npm run build`
- `npm run test:fixtures` (all fixture cases pass, including new regressions)
- `npm run smoke:cli`
- `npm run smoke:cli:ts`

## Next
- Add TS scanner support for generated SDK object-literal resources (Stripe Node pattern).
- Re-run `stripe-node-ts` real-world validation and confirm operation matches increase from `0`.
- Classify remaining Ory/Stripe findings into true drift vs residual scanner limitations.
- Promote stable validation commands into CI (non-blocking matrix first, then required checks).
