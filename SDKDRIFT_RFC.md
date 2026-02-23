# RFC: SDKDrift Drift Detection and Scoring Pipeline

- Status: Draft
- Authors: SDKDrift contributors
- Last Updated: 2026-02-23

## 1. Context

Schema validation confirms OpenAPI internal consistency but does not guarantee SDK parity. Generated SDKs can lag, rename, wrap, or omit operations and parameters. Teams need deterministic drift detection with low false-positive rates and a CI-compatible quality signal.

## 2. Goals

- Detect contract-to-SDK divergence at operation and parameter levels.
- Prioritize actionable failures over informational coverage gaps.
- Provide stable machine-readable output for CI and tooling.
- Keep matcher robust across naming styles and generated SDK conventions.
- Prevent score saturation on large specs.

## 3. Non-Goals

- Full semantic type-system equivalence across languages.
- Runtime behavior verification of SDK calls.
- Language scanner completeness for all SDK generator patterns in initial launch scope.

## 4. Terminology

- Operation Surface: normalized OpenAPI operation representation.
- SDK Method Surface: normalized SDK callable method representation.
- Match Result: mapping from operation to method with strategy and confidence.
- Actionable Finding: finding that should block or warn release workflows.
- Coverage Note: informational mismatch not immediately release-blocking.

## 5. Proposal

### 5.1 Pipeline

1. Parse OpenAPI paths/methods into `OperationSurface`.
2. Scan SDK source into `SdkMethodSurface`.
3. Match operations to methods with layered strategy.
4. Compute categorized findings.
5. Score findings using weighted normalized model.
6. Render output (`terminal`, `json`, `markdown`).

### 5.2 Matching Strategy

Ordered strategy application:

1. `override` (config explicit mapping)
2. `exact` normalized ID match
3. `heuristic` weighted token/param/action scoring
4. `path_fallback` resource/action/path-param fallback
5. `unmatched` reason classification

### 5.3 Heuristic Features

- operationId + path token overlap
- HTTP-verb hint token boosting
- parameter overlap
- namespace/source-file signal boosts
- action consistency bonus/penalty
- path-param consistency checks

### 5.4 Unmatched Reasons

- `no_matching_resource_in_sdk`
- `no_matching_action_in_resource`
- `path_based_match_available`
- `low_confidence_unmatched`

## 6. Over-Correction Controls

To avoid aggressive false positives:

- dynamic-parameter bag detection downgrades some parameter drift to `param_not_explicit`
- unsupported-resource reclassification for absent SDK resource vocabulary
- scanner wrapper exclusions to avoid synthetic/non-user call surfaces
- fallback thresholding (`path_fallback`) to constrain overmatching

## 7. Scoring Model

### 7.1 Weighted Categories

- `missing_endpoint`: 8
- `required_field_added`: 5
- `unsupported_resource`: 4
- `type_mismatch`: 3
- `changed_param`: 3
- `deprecated_mismatch`: 2
- `extra_sdk_method`: 1
- `param_not_explicit`: 0.5

### 7.2 Normalization

- cap selected category counts to unmatched operation count
- compute weighted deduction sum
- normalize by `max(1, operationsTotal / 10)`
- final score: `max(0, round(100 - normalizedDeduction))`

This keeps scores meaningful for both small and very large APIs.

## 8. Report Contract

Output includes:

- `score`
- `summary` (`operationsTotal`, `operationsMatched`, `findingsTotal`)
- `unmatchedReasons`
- `deductions`
- `weightedDeductions`
- `findings`
- `actionableFindings`
- `coverageNotes`

Per-finding confidence is included for downstream triage and ranking.

## 9. Packaging and Delivery

Packages:

- `@sdkdrift/core`
- `@sdkdrift/python-scanner`
- `@sdkdrift/cli`

Delivery controls:

- CI validates build, fixtures, and smoke scans
- dry-run package tarball workflow
- publish workflow with version prep and dependency-range validation

## 10. Operational Risks

- scanner gaps for specific generated patterns (e.g., TS extension idioms)
- repo-specific naming patterns can reduce matcher confidence
- threshold misconfiguration can over-block or under-block releases

## 11. Mitigations

- config overrides (`sdkdrift.config.yaml`)
- unmatched reason visibility
- category split into actionable vs coverage
- regression fixture additions for each discovered false-positive class

## 12. Validation and Benchmarks

Validation sources include fixture matrix and real-world ecosystem scans (Ory/OpenAI/Stripe). Current evidence shows substantial noise reduction and improved stability, with known remaining extraction gaps explicitly tracked.

## 13. Alternatives Considered

- exact-only mapping: high precision, poor recall
- unweighted score model: insensitive to severity
- non-normalized weighted model: score collapse on large specs
- semantic type-check integration: high complexity and language coupling

## 14. Future Work

- expand TS scanner support for generated object-literal extension patterns
- improve matcher handling of hyphenated and org/admin operation groups
- add CI matrix over external benchmark repositories
- refine confidence calibration with empirical outcome data
