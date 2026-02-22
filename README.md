# SDKDrift

Detect when your generated SDKs drift from your OpenAPI spec.

[![npm version](https://img.shields.io/npm/v/%40sdkdrift%2Fcli?label=npm&color=cb3837)](https://www.npmjs.com/package/@sdkdrift/cli)
[![License](https://img.shields.io/github/license/dharmarajatulya1-hub/sdkdrift)](./LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/dharmarajatulya1-hub/sdkdrift/ci.yml?branch=main&label=build)](https://github.com/dharmarajatulya1-hub/sdkdrift/actions/workflows/ci.yml)

**Topics:** `openapi` `sdk` `drift-detection` `developer-tools` `cli` `code-generation` `api`

SDKDrift detects drift between your OpenAPI contract and generated SDK surface, reports actionable mismatches, and gives you a score you can gate in CI.

## Demo

![SDKDrift demo - check finding drift](./.github/assets/sdkdrift-check-demo.svg)

Asciicast (optional): `https://asciinema.org/a/<cast-id>`

```bash
sdkdrift scan --spec ./demo/openapi.yaml --sdk ./demo/sdk/python --lang python
```

## Quick Start (3 commands)

```bash
npm install -g sdkdrift
sdkdrift scan --help
sdkdrift scan --spec ./demo/openapi.yaml --sdk ./demo/sdk/python --lang python
```

## Works With

- Stainless
- Speakeasy
- OpenAPI Generator
- Swagger Codegen
- Fern
- Custom in-house generators

## What It Solves

When your API spec evolves faster than generated SDKs, users hit missing methods, required-parameter breaks, and type mismatches.
SDKDrift catches this before release.

## CLI

```bash
sdkdrift scan --spec <pathOrUrl> --sdk <path> --lang <python|ts> [options]
```

### Options

- `--spec <pathOrUrl>`: OpenAPI file path or URL
- `--sdk <path>`: SDK root directory
- `--lang <python|ts>`: language scanner
- `--format <terminal|json|markdown>`: output format (default `terminal`)
- `--config <path>`: config file path (`sdkdrift.config.yaml`)
- `--out <path>`: write report to file
- `--min-score <0..100>`: fail process when score is lower than threshold
- `--verbose`: emit matcher diagnostics to stderr

### Exit Codes

- `0`: success and score >= threshold
- `1`: runtime/config/parse error
- `2`: score below `--min-score`

## Config (`sdkdrift.config.yaml`)

```yaml
match:
  heuristicThreshold: 0.55
mapping:
  overrides:
    - operationId: listUsers
      sdkMethod: UsersApi.fetch_users
```

Validation rules: `CONFIG_SPEC.md`

## Output Example

```text
SDKDrift Report
Score: 92/100
Operations: 1/2 matched
Findings: 1
- [high] missing_endpoint: Operation getUser is not represented in SDK
```

JSON contract stability: `SCHEMA.md`

## CI Usage

```yaml
name: SDK Drift Check
on: [push]
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @sdkdrift/cli scan --spec ./openapi.yaml --sdk ./sdk/python --lang python --min-score 90
```

## Packages

- `@sdkdrift/cli`: command-line interface
- `@sdkdrift/core`: parser, matcher, diff, scoring engine
- `@sdkdrift/python-scanner`: language scanner package

## Repository Layout

- `packages/core`: parsing, matching, diffing, scoring
- `packages/cli`: command orchestration and output
- `packages/python-scanner`: scanner runtime
- `packages/landing`: marketing/waitlist site
- `fixtures`: fixture matrix for behavior validation
- `tests`: smoke and fixture test runner

## Docs Index

- `STATUS.md`: project execution status
- `SCHEMA.md`: JSON report contract
- `CONFIG_SPEC.md`: config contract
- `VALIDATION_REPORT.md`: latest validation summary
- `RELEASE.md`: release and publish guide
- `RELEASE_NOTES_v0.2.0.md`: release notes
- `packages/landing/README.md`: landing env/setup docs

## Troubleshooting

- Config errors: validate `sdkdrift.config.yaml` against `CONFIG_SPEC.md`
- No CLI updates after changes: rebuild or reinstall package
- Waitlist failures: confirm Supabase env vars are set in Vercel project env vars

## License

MIT. See `LICENSE`.
