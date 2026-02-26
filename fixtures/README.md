# SDKDrift Fixtures

Initial fixtures for MVP scanner and CLI tests.

- `simple/openapi.yaml`: minimal OpenAPI example
- `simple/sdk/python/client.py`: minimal Python SDK example
- `cases/missing-endpoint`: emits `missing_endpoint`
- `cases/required-param`: emits `required_field_added`
- `cases/type-mismatch`: emits `type_mismatch`
- `cases/override`: validates `sdkdrift.config.yaml` mapping override
- `cases/ts-basic`: validates TypeScript scanning path
- `cases/ts-stripe-extend`: validates TypeScript `*.extend({...})` extraction path
- `cases/ts-stripe-extend-method-style`: validates method-style members in `*.extend({...})`
- `cases/heuristic-nested`: validates nested resource heuristic matching
- `cases/optional-param`: emits `changed_param` for optional mismatch
- `cases/invalid-config`: validates config schema error handling
