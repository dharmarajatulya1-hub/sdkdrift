# SDKDrift Config Spec (`sdkdrift.config.yaml`)

Current support scope: matcher configuration.

## Example
```yaml
match:
  heuristicThreshold: 0.55
  mode: precision
  minConfidenceActionable: 0.7
  minTop2Margin: 0.08
  abstainOverGuess: true
mapping:
  overrides:
    - operationId: listUsers
      sdkMethod: UsersApi.fetch_users
diff:
  ignore:
    extraMethods:
      - "MiscApi\\.debug_trace"
```

## Fields
- `match.heuristicThreshold`:
  - number between `0` and `1`.
  - higher means stricter heuristic matching.
- `match.mode`:
  - one of `precision|balanced|recall`.
- `match.minConfidenceActionable`:
  - number between `0` and `1`.
- `match.minTop2Margin`:
  - number between `0` and `1`.
- `match.abstainOverGuess`:
  - boolean; when `true`, ambiguous top matches are left unmatched.
- `mapping.overrides`:
  - array of explicit operation-to-method mappings.
  - each entry requires:
    - `operationId` (non-empty string)
    - `sdkMethod` (non-empty string)
- `diff.ignore.extraMethods`:
  - array of regex strings used to suppress noisy `extra_sdk_method` findings.

## Validation Rules
- Root must be an object.
- `match` and `mapping` must be objects if provided.
- `mapping.overrides` must be an array if provided.
- Duplicate `operationId` values are rejected.
- Invalid regex in `diff.ignore.extraMethods` is rejected.
- Invalid config returns CLI exit code `1` with actionable error text.
