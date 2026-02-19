# SDKDrift Release Guide (MVP)

## Goal
Produce release artifacts safely before npm publishing.

## Current Strategy
Use CI to run a release dry-run (`npm pack`) for:
- `@sdkdrift/core`
- `@sdkdrift/python-scanner`
- `@sdkdrift/cli`

This validates package integrity and build outputs.

## Release Dry-Run
1. Trigger workflow: `Release Dry Run`.
2. Confirm all jobs pass.
3. Download generated tarballs from workflow artifacts.
4. Optionally test locally:
   - `npm i -g <cli-tarball>`
   - `sdkdrift scan ...`

## Publish Readiness Checklist
- Build and fixture tests are green.
- CLI smoke tests are green.
- Landing deployment is healthy.
- Report/config contracts are updated (`SCHEMA.md`, `CONFIG_SPEC.md`).

## Notes
- Current monorepo uses local file dependencies for development.
- Before first public npm release, finalize package dependency versioning strategy.
