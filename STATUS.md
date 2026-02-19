# SDKDrift Status

Last updated: 2026-02-19
Branch: `main`
Latest commit: `ea6f0db`

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
- Diff categories implemented and validated.
- Fixture matrix + automated fixture test runner.
- Next.js landing with waitlist-first CTA, legal pages, and metadata.
- CI workflow with build + fixtures + smoke checks.
- Public contracts: `SCHEMA.md`, `CONFIG_SPEC.md`.
- Validation snapshot: `VALIDATION_REPORT.md`.
- CLI diagnostics: `--verbose` matcher output to stderr.
- Release docs/workflows: `RELEASE.md`, `release-dry-run.yml`.

## Current MVP State
- `python` scan path: functional
- `ts` scan path: functional
- score + threshold exit code: functional
- config overrides + validation: functional
- landing waitlist: provider-backed via env webhook

## In Progress (Current Milestone)
1. NPM publish strategy finalization
- [x] Convert internal package deps from `file:` to semver ranges.
- [x] Add release scripts (`release:prepare`, `release:check`).
- [x] Add publish workflow (`.github/workflows/publish.yml`).
- [x] Update release/readme docs for publish flow.
- [ ] Commit and push milestone.

## Final MVP Sign-off Checklist
- [x] Contracts documented and versioned.
- [x] Core scan behavior validated on expanded fixture suite.
- [x] CLI diagnostics and threshold behavior verified.
- [x] Landing page deployed with configurable waitlist backend.
- [x] CI validates build + fixtures + smoke paths.
- [x] Release dry-run + publish workflows exist.
- [ ] Lockfile refreshed in networked environment after dependency strategy change.

## Remaining for First Public NPM Publish
- Run `npm install` locally to refresh `package-lock.json` and commit if changed.
- Add `NPM_TOKEN` to GitHub repository secrets.
- Run `Publish Packages` workflow with `dry_run=true`, then `dry_run=false`.
