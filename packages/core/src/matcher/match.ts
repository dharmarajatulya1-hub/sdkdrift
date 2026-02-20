import type { MatchOptions, MatchResult, OperationSurface, SdkMethodSurface, UnmatchedReason } from "../types/contracts.js";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toTokens(value: string): string[] {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function normalizeParamName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function singularizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

const actionGroups: Record<string, readonly string[]> = {
  create: ["create", "add", "new", "post"],
  update: ["update", "modify", "patch", "edit", "set", "put"],
  retrieve: ["get", "retrieve", "read", "fetch"],
  list: ["list"],
  delete: ["delete", "remove", "destroy", "del"],
  cancel: ["cancel", "abort", "stop"],
  pause: ["pause"],
  resume: ["resume"],
  search: ["search", "find"],
  run: ["run", "execute"],
  validate: ["validate", "check", "verify"],
  upload: ["upload"],
  download: ["download"]
};

const ignoredSourcePathTokens = new Set([
  "src",
  "lib",
  "dist",
  "resource",
  "resources",
  "client",
  "clients",
  "sdk",
  "api",
  "python",
  "typescript",
  "openai"
]);

const ignoredResourceTokens = new Set([
  ...ignoredSourcePathTokens,
  "v1",
  "v2",
  "v3",
  "http",
  "https"
]);

function tokenVariants(token: string): string[] {
  const variants = new Set([token]);
  if (token.endsWith("ies") && token.length > 3) {
    variants.add(`${token.slice(0, -3)}y`);
  }
  if (token.endsWith("s") && token.length > 3) {
    variants.add(token.slice(0, -1));
  }
  if (token.endsWith("es") && token.length > 4) {
    variants.add(token.slice(0, -2));
  }
  for (const aliases of Object.values(actionGroups)) {
    if (aliases.includes(token)) {
      for (const alias of aliases) {
        variants.add(alias);
      }
      break;
    }
  }
  return [...variants];
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    if (/^v[0-9]+$/.test(token) || token === "api") continue;
    for (const variant of tokenVariants(token)) {
      expanded.add(variant);
    }
  }
  return [...expanded];
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

function sourceFileTokens(sourceFile?: string): string[] {
  if (!sourceFile) return [];
  return sourceFile
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .flatMap(toTokens)
    .filter((token) => !ignoredSourcePathTokens.has(token));
}

function canonicalAction(token: string): string | undefined {
  for (const [action, aliases] of Object.entries(actionGroups)) {
    if (aliases.includes(token)) return action;
  }
  return undefined;
}

function extractAction(tokens: string[]): string | undefined {
  for (const token of tokens) {
    const action = canonicalAction(token);
    if (action) return action;
  }
  return undefined;
}

function operationSegments(path: string): string[] {
  return path
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("{") && segment.endsWith("}")));
}

function inferOperationAction(operation: OperationSurface): string | undefined {
  const opIdAction = extractAction(toTokens(operation.operationId));
  if (opIdAction) return opIdAction;

  const segments = operationSegments(operation.path);
  const tail = segments.length ? segments[segments.length - 1] ?? "" : "";
  const tailAction = extractAction(toTokens(tail));
  if (tailAction) return tailAction;

  const hasTrailingParam = /\/\{[^}]+\}\s*$/.test(operation.path);
  if (operation.method === "get") return hasTrailingParam ? "retrieve" : "list";
  if (operation.method === "post") return hasTrailingParam ? "update" : "create";
  if (operation.method === "put" || operation.method === "patch") return "update";
  return "delete";
}

function operationResourceTokens(operation: OperationSurface): string[] {
  const segments = operationSegments(operation.path);
  if (!segments.length) return [];
  const tailAction = extractAction(toTokens(segments[segments.length - 1] ?? ""));
  const resourceSegments = tailAction && segments.length > 1 ? segments.slice(0, -1) : segments;
  return expandTokens(
    resourceSegments
      .flatMap((segment) => toTokens(segment))
      .filter((token) => !ignoredResourceTokens.has(token))
  );
}

function methodResourceTokens(method: SdkMethodSurface): string[] {
  const sourceTokens = sourceFileTokens(method.sourceFile);
  const namespaceTokens = toTokens(method.namespace);
  const methodTokens = toTokens(method.methodName);
  const actionTokens = new Set(Object.values(actionGroups).flat());

  return expandTokens(
    [...sourceTokens, ...namespaceTokens, ...methodTokens].filter(
      (token) => !ignoredResourceTokens.has(token) && !actionTokens.has(token)
    )
  );
}

function fallbackScore(operation: OperationSurface, method: SdkMethodSurface): number {
  const opResources = [...new Set(operationResourceTokens(operation).map(singularizeToken))];
  const methodResources = [...new Set(methodResourceTokens(method).map(singularizeToken))];
  const resourceOverlapScore = overlapScore(opResources, methodResources);
  const methodResourceSet = new Set(methodResources);
  const resourceContainmentScore = opResources.length
    ? opResources.filter((token) => methodResourceSet.has(token)).length / opResources.length
    : 0;
  const resourceScore = Math.max(resourceOverlapScore, resourceContainmentScore);
  if (resourceScore === 0) return 0;

  const opAction = inferOperationAction(operation);
  const methodAction = extractAction([...toTokens(method.namespace), ...toTokens(method.methodName)]);
  const actionScore = opAction && methodAction && opAction === methodAction ? 1 : 0;
  if (opAction && methodAction && opAction !== methodAction) return 0;

  const specPathParams = operation.pathParams.map((param) => normalizeParamName(param.name));
  const sdkParams = method.params.map((param) => normalizeParamName(param.name));
  const hasBagParam = sdkParams.some(
    (name) => name.includes("request") || name.includes("params") || name.includes("options") || name.includes("input")
  );
  const pathParamScore = specPathParams.length ? overlapScore(specPathParams, sdkParams) : hasBagParam ? 0.6 : 0.5;

  return resourceScore * 0.65 + actionScore * 0.25 + pathParamScore * 0.1;
}

function classifyUnmatchedReason(
  operation: OperationSurface,
  methods: SdkMethodSurface[],
  usedMethodIds: Set<string>
): UnmatchedReason {
  const availableMethods = methods.filter((method) => !usedMethodIds.has(method.id));
  const opResources = [...new Set(operationResourceTokens(operation).map(singularizeToken))];
  const resourceCandidates = availableMethods.filter((method) => {
    const methodResources = [...new Set(methodResourceTokens(method).map(singularizeToken))];
    return overlapScore(opResources, methodResources) > 0;
  });

  if (resourceCandidates.length === 0) return "no_matching_resource_in_sdk";

  const opAction = inferOperationAction(operation);
  if (!opAction) return "low_confidence_unmatched";

  const actionCandidates = resourceCandidates.filter((method) => {
    const methodAction = extractAction([...toTokens(method.namespace), ...toTokens(method.methodName)]);
    return methodAction === opAction;
  });

  if (actionCandidates.length === 0) return "no_matching_action_in_resource";
  return "path_based_match_available";
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
  const opPathTokens = pathTokens(operation.path);
  const opTokens = expandTokens([
    ...toTokens(operation.operationId),
    ...opPathTokens,
    ...methodVerbHints(operation.method)
  ]);
  const sourceTokens = sourceFileTokens(method.sourceFile);
  const methodTokens = expandTokens([...toTokens(method.namespace), ...toTokens(method.methodName), ...sourceTokens]);
  const tokenScore = overlapScore(opTokens, methodTokens);

  const specParams = [...operation.pathParams, ...operation.queryParams].map((p) => normalizeParamName(p.name));
  const sdkParams = method.params.map((p) => normalizeParamName(p.name));
  const paramScore = specParams.length ? overlapScore(specParams, sdkParams) : 0.5;
  const verbTokens = methodVerbHints(operation.method);
  const hasVerbSignal = methodTokens.some((token) => verbTokens.includes(token));
  const verbBoost = hasVerbSignal ? 0.1 : 0;
  const pathTokenSet = new Set(opPathTokens);
  const namespaceTokens = toTokens(method.namespace);
  const namespacePathBoost = namespaceTokens.some((token) => pathTokenSet.has(token)) ? 0.05 : 0;
  const sourcePathBoost = sourceTokens.length ? overlapScore(opPathTokens, sourceTokens) * 0.1 : 0;

  const operationAction = extractAction([...toTokens(operation.operationId), ...methodVerbHints(operation.method)]);
  const methodAction = extractAction([...toTokens(method.namespace), ...toTokens(method.methodName)]);
  let actionScore = 0;
  if (operationAction && methodAction) {
    actionScore = operationAction === methodAction ? 0.12 : -0.12;
  }

  const pathParamNames = operation.pathParams.map((param) => normalizeParamName(param.name)).filter(Boolean);
  const hasBagParam = method.params.some((param) => {
    const name = normalizeParamName(param.name);
    return name.includes("request") || name.includes("params") || name.includes("options") || name.includes("input");
  });
  let pathParamScore = 0;
  if (pathParamNames.length) {
    const pathParamMatches = pathParamNames.filter((name) => sdkParams.includes(name)).length;
    if (pathParamMatches > 0) {
      pathParamScore = (pathParamMatches / pathParamNames.length) * 0.08;
    } else if (!hasBagParam) {
      pathParamScore = -0.08;
    }
  }

  return tokenScore * 0.55 + paramScore * 0.2 + verbBoost + namespacePathBoost + sourcePathBoost + actionScore + pathParamScore;
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
      const overrideMethod =
        methods.find((m) => !usedMethodIds.has(m.id) && m.id === overrideMethodId) ??
        methods.find(
          (m) => !usedMethodIds.has(m.id) && `${m.namespace}.${m.methodName}` === overrideMethodId
        );
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

    let fallbackBest: SdkMethodSurface | undefined;
    let fallbackBestScore = 0;
    for (const method of methods) {
      if (usedMethodIds.has(method.id)) continue;
      const score = fallbackScore(operation, method);
      if (score > fallbackBestScore) {
        fallbackBestScore = score;
        fallbackBest = method;
      }
    }

    if (fallbackBest && fallbackBestScore >= 0.72) {
      usedMethodIds.add(fallbackBest.id);
      return {
        operationId: operation.operationId,
        sdkMethodId: fallbackBest.id,
        confidence: Number(fallbackBestScore.toFixed(3)),
        strategy: "path_fallback"
      };
    }

    return {
      operationId: operation.operationId,
      confidence: 0,
      strategy: "unmatched",
      unmatchedReason: classifyUnmatchedReason(operation, methods, usedMethodIds)
    };
  });
}
