# SDKDrift Config Spec (`sdkdrift.config.yaml`)

Current support scope: matcher configuration.

## Example
```yaml
match:
  heuristicThreshold: 0.55
mapping:
  overrides:
    - operationId: listUsers
      sdkMethod: UsersApi.fetch_users
```

## Fields
- `match.heuristicThreshold`:
  - number between `0` and `1`.
  - higher means stricter heuristic matching.
- `mapping.overrides`:
  - array of explicit operation-to-method mappings.
  - each entry requires:
    - `operationId` (non-empty string)
    - `sdkMethod` (non-empty string)

## Validation Rules
- Root must be an object.
- `match` and `mapping` must be objects if provided.
- `mapping.overrides` must be an array if provided.
- Duplicate `operationId` values are rejected.
- Invalid config returns CLI exit code `1` with actionable error text.
