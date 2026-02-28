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
  if (availableMethods.every((method) => (method.scannerConfidence ?? 1) < 0.45)) {
    return "scanner_low_evidence";
  }
  const opResources = [...new Set(operationResourceTokens(operation).map(singularizeToken))];
  const resourceCandidates = availableMethods.filter((method) => {
    const methodResources = [...new Set(methodResourceTokens(method).map(singularizeToken))];
    return overlapScore(opResources, methodResources) > 0;
  });

  if (resourceCandidates.length === 0) return "resource_missing";

  const opAction = inferOperationAction(operation);
  if (!opAction) return "low_confidence_unmatched";

  const actionCandidates = resourceCandidates.filter((method) => {
    const methodAction = extractAction([...toTokens(method.namespace), ...toTokens(method.methodName)]);
    return methodAction === opAction;
  });

  if (actionCandidates.length === 0) return "action_missing";
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
  const mode = options.mode ?? "precision";
  const thresholdByMode: Record<"precision" | "balanced" | "recall", number> = {
    precision: 0.58,
    balanced: 0.5,
    recall: 0.4
  };
  const threshold = options.heuristicThreshold ?? thresholdByMode[mode];
  const minConfidenceActionable = options.minConfidenceActionable ?? (mode === "precision" ? 0.7 : 0.55);
  const minTop2Margin = options.minTop2Margin ?? (mode === "precision" ? 0.08 : 0.04);
  const abstainOverGuess = options.abstainOverGuess ?? mode === "precision";
  const overrides = options.overrides ?? {};
  const fixedMatches = new Map<string, MatchResult>();
  const lockedMethodIds = new Set<string>();

  for (const operation of operations) {
    const overrideMethodId = overrides[operation.operationId];
    if (!overrideMethodId) continue;
    const overrideMethod =
      methods.find((m) => !lockedMethodIds.has(m.id) && m.id === overrideMethodId) ??
      methods.find((m) => !lockedMethodIds.has(m.id) && `${m.namespace}.${m.methodName}` === overrideMethodId);
    if (!overrideMethod) continue;
    lockedMethodIds.add(overrideMethod.id);
    fixedMatches.set(operation.operationId, {
      operationId: operation.operationId,
      sdkMethodId: overrideMethod.id,
      confidence: 1,
      strategy: "override",
      evidence: { mode, minConfidenceActionable, minTop2Margin }
    });
  }

  for (const operation of operations) {
    if (fixedMatches.has(operation.operationId)) continue;
    const direct = methods.find(
      (method) =>
        !lockedMethodIds.has(method.id) &&
        (normalize(method.methodName) === normalize(operation.operationId) ||
          normalize(`${method.namespace}${method.methodName}`) === normalize(operation.operationId))
    );
    if (!direct) continue;
    lockedMethodIds.add(direct.id);
    fixedMatches.set(operation.operationId, {
      operationId: operation.operationId,
      sdkMethodId: direct.id,
      confidence: 1,
      strategy: "exact",
      evidence: { mode, minConfidenceActionable, minTop2Margin }
    });
  }

  const remainingOperations = operations.filter((operation) => !fixedMatches.has(operation.operationId));
  const remainingMethods = methods.filter((method) => !lockedMethodIds.has(method.id));
  const methodIndex = new Map(remainingMethods.map((method, idx) => [method.id, idx]));

  type CandidateDetails = {
    operation: OperationSurface;
    ranked: Array<{ sdkMethodId: string; confidence: number; strategy: "heuristic" | "path_fallback" }>;
    topCandidates: Array<{ sdkMethodId: string; confidence: number }>;
    topMargin: number;
    ambiguousTopCandidates: boolean;
  };

  const candidateDetails: CandidateDetails[] = remainingOperations.map((operation) => {
    const ranked = remainingMethods
      .map((method) => {
        const heuristic = candidateScore(operation, method);
        const fallback = fallbackScore(operation, method);
        if (fallback >= heuristic && fallback >= 0.72) {
          return {
            sdkMethodId: method.id,
            confidence: Number(fallback.toFixed(3)),
            strategy: "path_fallback" as const
          };
        }
        return {
          sdkMethodId: method.id,
          confidence: Number(heuristic.toFixed(3)),
          strategy: "heuristic" as const
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    const first = ranked[0]?.confidence ?? 0;
    const second = ranked[1]?.confidence ?? 0;
    const topMargin = Math.max(0, first - second);
    const ambiguousTopCandidates = topMargin < minTop2Margin && second >= threshold;
    return {
      operation,
      ranked,
      topCandidates: ranked.slice(0, 3).map(({ sdkMethodId, confidence }) => ({ sdkMethodId, confidence })),
      topMargin,
      ambiguousTopCandidates
    };
  });

  function isEligible(confidence: number, strategy: "heuristic" | "path_fallback"): boolean {
    if (strategy === "path_fallback") return confidence >= 0.72;
    return confidence >= threshold;
  }

  function hungarianMax(matrix: number[][]): number[] {
    const n = matrix.length;
    const m = n > 0 ? matrix[0].length : 0;
    if (n === 0 || m === 0) return Array(n).fill(-1);
    const width = Math.max(n, m);
    const maxValue = matrix.reduce((acc, row) => Math.max(acc, ...row), 0);
    const a: number[][] = Array.from({ length: n + 1 }, (_, i) =>
      Array.from({ length: width + 1 }, (_, j) => {
        if (i === 0 || j === 0) return 0;
        const weight = j <= m ? matrix[i - 1]?.[j - 1] ?? 0 : 0;
        return maxValue - weight;
      })
    );
    const u = new Array(n + 1).fill(0);
    const v = new Array(width + 1).fill(0);
    const p = new Array(width + 1).fill(0);
    const way = new Array(width + 1).fill(0);

    for (let i = 1; i <= n; i += 1) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(width + 1).fill(Number.POSITIVE_INFINITY);
      const used = new Array(width + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Number.POSITIVE_INFINITY;
        let j1 = 0;
        for (let j = 1; j <= width; j += 1) {
          if (used[j]) continue;
          const cur = a[i0][j] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
        for (let j = 0; j <= width; j += 1) {
          if (used[j]) {
            u[p[j]] += delta;
            v[j] -= delta;
          } else {
            minv[j] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const assignment = Array(n).fill(-1);
    for (let j = 1; j <= width; j += 1) {
      const i = p[j];
      if (i > 0 && i <= n && j <= m) {
        assignment[i - 1] = j - 1;
      }
    }
    return assignment;
  }

  const matrix = candidateDetails.map((detail) => {
    const row = new Array(remainingMethods.length).fill(0);
    for (const candidate of detail.ranked) {
      const idx = methodIndex.get(candidate.sdkMethodId);
      if (typeof idx !== "number") continue;
      row[idx] = isEligible(candidate.confidence, candidate.strategy) ? candidate.confidence : 0;
    }
    return row;
  });
  const assignment = hungarianMax(matrix);
  const selectedMethodIds = new Set(lockedMethodIds);
  const byOperation = new Map<string, MatchResult>(fixedMatches);

  for (let opIdx = 0; opIdx < candidateDetails.length; opIdx += 1) {
    const detail = candidateDetails[opIdx];
    const methodIdx = assignment[opIdx] ?? -1;
    const candidate =
      methodIdx >= 0
        ? detail.ranked.find((item) => methodIndex.get(item.sdkMethodId) === methodIdx)
        : undefined;
    const evidence = {
      mode,
      threshold,
      minConfidenceActionable,
      minTop2Margin,
      topMargin: Number(detail.topMargin.toFixed(3))
    };

    if (
      candidate &&
      isEligible(candidate.confidence, candidate.strategy) &&
      (!abstainOverGuess || (!detail.ambiguousTopCandidates && candidate.confidence >= minConfidenceActionable))
    ) {
      selectedMethodIds.add(candidate.sdkMethodId);
      byOperation.set(detail.operation.operationId, {
        operationId: detail.operation.operationId,
        sdkMethodId: candidate.sdkMethodId,
        confidence: candidate.confidence,
        strategy: candidate.strategy,
        candidates: detail.topCandidates,
        evidence
      });
      continue;
    }

    byOperation.set(detail.operation.operationId, {
      operationId: detail.operation.operationId,
      confidence: 0,
      strategy: "unmatched",
      unmatchedReason: detail.ambiguousTopCandidates
        ? "ambiguous_top_candidates"
        : classifyUnmatchedReason(detail.operation, methods, selectedMethodIds),
      candidates: detail.topCandidates,
      evidence
    });
  }

  return operations.map((operation) => {
    return (
      byOperation.get(operation.operationId) ?? {
        operationId: operation.operationId,
        confidence: 0,
        strategy: "unmatched",
        unmatchedReason: classifyUnmatchedReason(operation, methods, selectedMethodIds),
        evidence: { mode, threshold, minConfidenceActionable, minTop2Margin }
      }
    );
  });
}
