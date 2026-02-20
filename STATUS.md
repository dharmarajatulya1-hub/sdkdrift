# SDKDrift Status

Last updated: 2026-02-20
Branch: `main`
Latest commit: `d4b493b`

## Sprint: MVP Release Wrap-Up

## Completed
- Packages published to npm under `@sdkdrift` scope.
- Landing CTA updated to npm CLI command (`npx @sdkdrift/cli`).
- README updated with:
  - npm install usage
  - CI example
  - updated command references
- Release notes prepared (`RELEASE_NOTES_v0.2.0.md`).
- Previous MVP hardening and release workflows remain in place.

## Current State
- CLI: publicly installable via npm (`@sdkdrift/cli`).
- Engine packages: published (`@sdkdrift/core`, `@sdkdrift/python-scanner`).
- Landing: deployed and aligned with npm-based CTA.
- CI: validates build + fixture tests + smoke checks.

## Next Priorities
1. Add changelog automation for future releases.
2. Add integration tests against external real SDK repos.
3. Add GitHub Action wrapper for one-line CI adoption.
4. Start onboarding docs for first external users.
