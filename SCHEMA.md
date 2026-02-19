# SDKDrift Report Schema

Version: `1`
Stability: Public contract for CLI JSON output.

## Report Object
```json
{
  "version": "1",
  "score": 92,
  "summary": {
    "operationsTotal": 2,
    "operationsMatched": 1,
    "findingsTotal": 1
  },
  "deductions": {
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
- `summary.operationsTotal`: total operations parsed from spec.
- `summary.operationsMatched`: operations matched to SDK methods.
- `summary.findingsTotal`: number of findings.
- `deductions`: map of category to accumulated penalty points.
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
- `operationId`: optional related OpenAPI operation id.
- `sdkMethodId`: optional related SDK method id.
- `message`: human readable description.
- `remediation`: optional suggested action.

## Compatibility Policy
- Additive fields are allowed in minor releases.
- Renaming or removing existing fields requires a `version` bump.
- Consumers should ignore unknown fields.
