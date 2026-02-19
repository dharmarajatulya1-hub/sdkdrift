# SDKDrift Release Guide (MVP)

## Goal
Publish `@sdkdrift/*` packages safely with repeatable checks.

## Current Strategy
Use CI workflows for:
- `Release Dry Run` (`npm pack` artifacts)
- `Publish Packages` (dry-run or real publish)

Target packages:
- `@sdkdrift/core`
- `@sdkdrift/python-scanner`
- `@sdkdrift/cli`

## Release Dry-Run
1. Trigger workflow: `Publish Packages` with:
   - `version`: e.g. `0.2.0`
   - `dry_run`: `true`
2. Confirm all jobs pass.
3. Verify publish output for all three workspaces.

Alternative artifact check:
1. Trigger workflow: `Release Dry Run`.
2. Download generated tarballs and test locally.

## Publish Readiness Checklist
- Build and fixture tests are green.
- CLI smoke tests are green.
- Landing deployment is healthy.
- Report/config contracts are updated (`SCHEMA.md`, `CONFIG_SPEC.md`).
- `NPM_TOKEN` repository secret is configured.

## Notes
- Internal package dependencies now use semver ranges (`^x.y.z`) for publishability.
- `npm run release:prepare -- <version>` updates internal package versions/dependencies before publish in workflow.
- After local dependency strategy changes, run `npm install` to refresh lockfile before release.
