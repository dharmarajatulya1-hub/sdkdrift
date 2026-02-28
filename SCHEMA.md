# SDKDrift Report Schema

Version: `2`
Stability: Public contract for CLI JSON output.

## Report Object
```json
{
  "version": "2",
  "score": 92,
  "scores": {
    "actionable": 91,
    "coverage": 96
  },
  "summary": {
    "operationsTotal": 2,
    "operationsMatched": 1,
    "findingsTotal": 1
  },
  "categoryCounts": {
    "missing_endpoint": 1
  },
  "weightedImpact": {
    "missing_endpoint": 8
  },
  "findings": [
    {
      "id": "missing_getUser",
      "category": "missing_endpoint",
      "severity": "high",
      "operationId": "getUser",
      "sdkMethodId": "UsersApi.getUser",
      "message": "Operation getUser is not represented in SDK",
      "remediation": "Add or regenerate corresponding SDK method"
    }
  ]
}
```

## Field Contract
- `version`: string schema version.
- `score`: integer from 0 to 100.
- `scores.actionable`: actionable risk score (0-100).
- `scores.coverage`: coverage quality score (0-100).
- `summary.operationsTotal`: total operations parsed from spec.
- `summary.operationsMatched`: operations matched to SDK methods.
- `summary.findingsTotal`: number of findings.
- `categoryCounts`: map of category to finding counts.
- `weightedImpact`: map of category to weighted score impact.
- `findings`: ordered list of drift findings.

## Finding Contract
- `id`: stable finding identifier string.
- `category`: one of:
  - `missing_endpoint`
  - `changed_param`
  - `required_field_added`
  - `type_mismatch`
  - `deprecated_mismatch`
  - `extra_sdk_method`
- `severity`: one of `critical|high|medium|low`.
- `ruleId`: deterministic rule identifier for replayability.
- `isActionable`: whether finding is release-actionable.
- `evidence`: machine-readable evidence payload.
- `operationId`: optional related OpenAPI operation id.
- `sdkMethodId`: optional related SDK method id.
- `message`: human readable description.
- `remediation`: optional suggested action.

## Compatibility Policy
- Additive fields are allowed in minor releases.
- Renaming or removing existing fields requires a `version` bump.
- Consumers should ignore unknown fields.

## Compatibility Mode
- CLI flag `--compat-v1` emits a reduced `version: "1"` JSON shape for legacy consumers.
