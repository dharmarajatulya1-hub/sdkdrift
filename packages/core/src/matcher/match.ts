import type { MatchOptions, MatchResult, OperationSurface, SdkMethodSurface } from "../types/contracts.js";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toTokens(value: string): string[] {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function methodVerbHints(method: OperationSurface["method"]): string[] {
  if (method === "get") return ["get", "list", "fetch", "retrieve", "read"];
  if (method === "post") return ["create", "add", "post", "new"];
  if (method === "put" || method === "patch") return ["update", "edit", "set", "patch", "put"];
  return ["delete", "remove", "destroy"];
}

function pathTokens(path: string): string[] {
  return path
    .split("/")
    .filter(Boolean)
    .filter((part) => !(part.startsWith("{") && part.endsWith("}")))
    .flatMap(toTokens);
}

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const as = new Set(a);
  const bs = new Set(b);
  let overlap = 0;
  for (const token of as) {
    if (bs.has(token)) overlap += 1;
  }
  return overlap / Math.max(as.size, bs.size);
}

function candidateScore(operation: OperationSurface, method: SdkMethodSurface): number {
  const opTokens = [
    ...toTokens(operation.operationId),
    ...pathTokens(operation.path),
    ...methodVerbHints(operation.method)
  ];
  const methodTokens = [...toTokens(method.namespace), ...toTokens(method.methodName)];
  const tokenScore = overlapScore(opTokens, methodTokens);

  const specParams = [...operation.pathParams, ...operation.queryParams].map((p) => p.name.toLowerCase());
  const sdkParams = method.params.map((p) => p.name.toLowerCase());
  const paramScore = specParams.length ? overlapScore(specParams, sdkParams) : 0.5;
  return tokenScore * 0.8 + paramScore * 0.2;
}

export function matchOperations(
  operations: OperationSurface[],
  methods: SdkMethodSurface[],
  options: MatchOptions = {}
): MatchResult[] {
  const threshold = options.heuristicThreshold ?? 0.45;
  const overrides = options.overrides ?? {};
  const usedMethodIds = new Set<string>();

  return operations.map((operation) => {
    const overrideMethodId = overrides[operation.operationId];
    if (overrideMethodId) {
      const overrideMethod = methods.find((m) => m.id === overrideMethodId);
      if (overrideMethod && !usedMethodIds.has(overrideMethod.id)) {
        usedMethodIds.add(overrideMethod.id);
        return {
          operationId: operation.operationId,
          sdkMethodId: overrideMethod.id,
          confidence: 1,
          strategy: "override"
        };
      }
    }

    const direct = methods.find(
      (method) =>
        !usedMethodIds.has(method.id) &&
        (normalize(method.methodName) === normalize(operation.operationId) ||
          normalize(`${method.namespace}${method.methodName}`) === normalize(operation.operationId))
    );

    if (direct) {
      usedMethodIds.add(direct.id);
      return {
        operationId: operation.operationId,
        sdkMethodId: direct.id,
        confidence: 1,
        strategy: "exact"
      };
    }

    let best: SdkMethodSurface | undefined;
    let bestScore = 0;
    for (const method of methods) {
      if (usedMethodIds.has(method.id)) continue;
      const score = candidateScore(operation, method);
      if (score > bestScore) {
        bestScore = score;
        best = method;
      }
    }

    if (best && bestScore >= threshold) {
      usedMethodIds.add(best.id);
      return {
        operationId: operation.operationId,
        sdkMethodId: best.id,
        confidence: Number(bestScore.toFixed(3)),
        strategy: "heuristic"
      };
    }

    return {
      operationId: operation.operationId,
      confidence: 0,
      strategy: "unmatched"
    };
  });
}
