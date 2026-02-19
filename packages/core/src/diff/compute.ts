import type {
  DriftFinding,
  MatchResult,
  OperationSurface,
  SdkMethodSurface
} from "../types/contracts.js";

export function computeDiff(
  operations: OperationSurface[],
  methods: SdkMethodSurface[],
  matches: MatchResult[]
): DriftFinding[] {
  const findings: DriftFinding[] = [];

  for (const match of matches) {
    if (!match.sdkMethodId) {
      findings.push({
        id: `missing_${match.operationId}`,
        category: "missing_endpoint",
        severity: "high",
        operationId: match.operationId,
        message: `Operation ${match.operationId} is not represented in SDK`,
        remediation: "Add or regenerate corresponding SDK method"
      });
    }
  }

  const matchedIds = new Set(matches.flatMap((m) => (m.sdkMethodId ? [m.sdkMethodId] : [])));
  for (const method of methods) {
    if (!matchedIds.has(method.id)) {
      findings.push({
        id: `extra_${method.id}`,
        category: "extra_sdk_method",
        severity: "low",
        sdkMethodId: method.id,
        message: `SDK method ${method.methodName} has no matched OpenAPI operation`
      });
    }
  }

  if (operations.length === 0) {
    findings.push({
      id: "empty_spec",
      category: "missing_endpoint",
      severity: "critical",
      message: "No operations found in parsed OpenAPI document",
      remediation: "Validate the OpenAPI file and ensure paths are present"
    });
  }

  return findings;
}
