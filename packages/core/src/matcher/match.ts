import type { MatchResult, OperationSurface, SdkMethodSurface } from "../types/contracts.js";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchOperations(
  operations: OperationSurface[],
  methods: SdkMethodSurface[]
): MatchResult[] {
  return operations.map((operation) => {
    const direct = methods.find((method) => normalize(method.methodName) === normalize(operation.operationId));

    if (direct) {
      return {
        operationId: operation.operationId,
        sdkMethodId: direct.id,
        confidence: 1,
        strategy: "exact"
      };
    }

    return {
      operationId: operation.operationId,
      confidence: 0,
      strategy: "unmatched"
    };
  });
}
