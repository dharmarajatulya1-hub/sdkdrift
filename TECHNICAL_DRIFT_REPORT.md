# SDKDrift Technical Report

## Problem Statement

Generated SDKs and OpenAPI contracts frequently diverge due to independent release timing, naming translation, wrappers, and language-specific surface conventions. This divergence causes runtime and integration failures not visible from schema validation alone.

SDKDrift addresses this by comparing parsed OpenAPI operation surfaces against extracted SDK method surfaces and producing classified findings plus a CI-gateable score.

## System Architecture

SDKDrift pipeline:

1. Parse OpenAPI into `OperationSurface[]`.
2. Extract SDK surface into `SdkMethodSurface[]`.
3. Match operations to SDK methods using layered strategies.
4. Compute drift findings from unmatched and mismatched pairs.
5. Score findings using weighted + normalized deduction model.
6. Render terminal/JSON/Markdown reports.

Primary modules:

- `packages/core/src/parser/openapi.ts`
- `packages/core/src/matcher/match.ts`
- `packages/core/src/diff/compute.ts`
- `packages/core/src/scoring/score.ts`
- `packages/core/src/index.ts`
- `packages/cli/src/cli.ts`

## Matching and Heuristics

Matching strategy order:

1. `override`
2. `exact`
3. `heuristic`
4. `path_fallback`
5. `unmatched`

### Exact Matching

Uses normalized comparisons between:

- `operationId` and method name
- `operationId` and namespace+method composite

### Heuristic Matching

`candidateScore` combines:

- token overlap from operationId/path/verb hints
- parameter name overlap
- verb-signal boosts
- namespace and source-file path boosts
- action mismatch penalty
- path parameter presence penalty

This layer balances recall with anti-overmatch penalties.

### Path Fallback

`fallbackScore` executes when heuristic confidence is below threshold. It relies on:

- resource token overlap/containment
- canonical action equivalence
- path param compatibility (or controlled bag-param tolerance)

Used threshold: `0.72`.

### Unmatched Classification

When no candidate passes:

- `no_matching_resource_in_sdk`
- `no_matching_action_in_resource`
- `path_based_match_available`
- `low_confidence_unmatched`

This reason model separates true absence from likely matcher/scanner limitations.

## Over-Correction and Noise Mitigation

False-positive controls implemented:

### Dynamic Parameter Downgrade

For SDK signatures that indicate dynamic bags (`kwargs`, `params`, `options`, `request`, `input`), missing explicit params are downgraded:

- from `changed_param`
- to `param_not_explicit`

This reduces high-noise findings in dynamic SDKs.

### Unsupported Resource Reclassification

If unmatched operation resource tokens do not appear in SDK vocabulary, finding category becomes:

- `unsupported_resource`

instead of hard `missing_endpoint`.

### Scanner Hygiene

TS scanner filters wrapper APIs and uses path-qualified IDs, reducing duplicate/indirect method noise.

## Diff and Type Normalization

`computeDiff` generates findings for:

- missing operation mapping
- required parameter absence
- optional parameter signature drift
- type mismatches
- extra SDK methods

Type normalization supports common alias/canonicalization patterns:

- string aliases (`str`, `text`, etc.)
- numeric aliases (`int`, `integer`, `float`, `double`, etc.)
- array/list canonicalization
- optional/union/annotated stripping
- literal type inference

## Scoring Model Improvements

Category weights:

- `missing_endpoint`: `8`
- `required_field_added`: `5`
- `unsupported_resource`: `4`
- `type_mismatch`: `3`
- `changed_param`: `3`
- `deprecated_mismatch`: `2`
- `extra_sdk_method`: `1`
- `param_not_explicit`: `0.5`

Enhancements:

- cap `missing_endpoint` and `unsupported_resource` counts by unmatched operations
- emit user-facing `deductions` as category counts
- retain `weightedDeductions` for score internals
- normalize deduction by spec size (`max(1, operationsTotal / 10)`) to prevent large-spec saturation to zero

Score formula:

- `score = max(0, round(100 - normalizedDeduction))`

## Reporting Model

Report includes:

- `findings`
- `actionableFindings`
- `coverageNotes`
- per-finding `confidence`
- `unmatchedReasons` summary counters
- `deductions` + `weightedDeductions`

This supports both CI automation and manual triage.

## Packaging and Release Engineering

Monorepo packages:

- `@sdkdrift/core`
- `@sdkdrift/python-scanner`
- `@sdkdrift/cli`

Release controls:

- `scripts/prepare-release.mjs` updates versions and internal ranges
- `scripts/check-publish-ready.mjs` blocks non-publishable local ranges
- workflows:
  - `.github/workflows/ci.yml`
  - `.github/workflows/release-dry-run.yml`
  - `.github/workflows/publish.yml`

CI baseline includes build, fixture tests, and smoke scans.

## Validation Snapshot (from project status)

Observed in tracked status artifacts:

- large reduction in noise for Ory/OpenAI validations
- stable matches in Ory post-refinement
- scoring uplift from normalization/reclassification
- open extraction gap remains for Stripe Node `StripeResource.extend(...)` patterns

## Known Limitations

- scanner limitations on specific generated-object patterns (notably Stripe Node)
- heuristic threshold still may require per-repo tuning
- type normalization is alias-based, not full semantic type checking

## Current Focus

- close TS scanner gap for object-literal extension patterns
- reduce residual unmatched operations on hyphenated/org-admin operation groups
- continue promoting validated checks into stricter CI gates
