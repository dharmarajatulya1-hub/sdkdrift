import type { DriftCategory, DriftFinding, MatchResult, OperationSurface, SdkMethodSurface } from "../types/contracts.js";

function normalizeParamName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findParam(method: SdkMethodSurface, name: string) {
  const target = normalizeParamName(name);
  return method.params.find((param) => normalizeParamName(param.name) === target);
}

function inferLiteralType(raw: string): string | undefined {
  const content = raw.replace(/\s+/g, "");
  const cleaned = content.replace(/["'`]/g, "");
  if (!cleaned) return undefined;

  if (/^(true|false)([|,](true|false))*$/i.test(cleaned)) return "boolean";
  if (/^-?\d+(\.\d+)?([|,]-?\d+(\.\d+)?)*$/.test(cleaned)) return "number";
  if (/^[a-z0-9_\-]+([|,][a-z0-9_\-]+)*$/i.test(cleaned)) return "string";

  return "string";
}

function normalizeType(value?: string): string {
  if (!value) return "unknown";
  let v = value.toLowerCase().trim();

  v = v.replace(/\s+/g, "");
  v = v.replace(/\|undefined|\|null|\|none/g, "");
  v = v.replace(/\|omit|\|notgiven|\|not_given/g, "");
  v = v.replace(/undefined\||null\||none\|/g, "");
  v = v.replace(/omit\||notgiven\||not_given\|/g, "");

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of [/^annotated\[(.+)\]$/, /^optional\[(.+)\]$/, /^union\[(.+)\]$/]) {
      const match = v.match(pattern);
      if (match) {
        v = match[1] ?? v;
        changed = true;
      }
    }
  }

  const literalMatch = v.match(/literal\[(.+?)\]/);
  if (literalMatch?.[1]) {
    return inferLiteralType(literalMatch[1]) ?? "string";
  }

  v = v.replace(/^promise<(.+)>$/, "$1");
  v = v.replace(/^readonlyarray<(.+)>$/, "$1[]");
  v = v.replace(/^array<(.+)>$/, "$1[]");
  v = v.replace(/^list<(.+)>$/, "$1[]");
  v = v.replace(/^list\[(.+)\]$/, "$1[]");
  v = v.replace(/^sequence\[(.+)\]$/, "$1[]");
  v = v.replace(/^tuple\[(.+)\]$/, "$1[]");

  const alnum = v.replace(/[^a-z0-9\[\]]/g, "");

  const aliases: Record<string, string> = {
    str: "string",
    string: "string",
    text: "string",
    uuid: "string",
    date: "string",
    datetime: "string",
    int: "number",
    int32: "number",
    int64: "number",
    integer: "number",
    float: "number",
    double: "number",
    decimal: "number",
    number: "number",
    bool: "boolean",
    boolean: "boolean",
    dict: "object",
    map: "object",
    record: "object",
    object: "object",
    json: "object"
  };

  if (alnum.endsWith("[]")) return "array";
  if (alnum.startsWith("strictstr") || alnum.startsWith("str")) return "string";
  if (alnum.startsWith("int") || alnum.startsWith("number") || alnum.includes("intfield")) return "number";
  if (alnum.startsWith("float") || alnum.startsWith("double") || alnum.startsWith("decimal")) return "number";
  if (alnum.startsWith("bool")) return "boolean";
  if (alnum.startsWith("dict") || alnum.startsWith("map") || alnum.startsWith("record") || alnum.startsWith("object")) {
    return "object";
  }
  if (alnum.startsWith("literal") || alnum.includes("enum")) return "string";
  return aliases[alnum] ?? alnum;
}

function usesParameterBag(method: SdkMethodSurface): boolean {
  if (method.params.length === 0) return false;
  if (method.params.length > 2) return false;
  return method.params.some((param) => {
    const name = normalizeParamName(param.name);
    const type = normalizeType(param.type?.name ?? param.type?.raw);
    const looksLikeBagName =
      name.includes("request") || name.includes("params") || name.includes("options") || name.includes("input");
    const looksLikeBagType = type.includes("request") || type.includes("param") || type.includes("option");
    return looksLikeBagName || looksLikeBagType;
  });
}

function severityFor(category: DriftCategory): DriftFinding["severity"] {
  if (category === "missing_endpoint" || category === "required_field_added") return "high";
  if (category === "unsupported_resource") return "medium";
  if (category === "type_mismatch" || category === "changed_param") return "medium";
  return "low";
}

function tokenize(value: string): string[] {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function singularize(token: string): string {
  if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function operationResourceToken(path: string): string | undefined {
  const ignored = new Set(["v1", "v2", "v3", "api", "openapi"]);
  const parts = path
    .split("/")
    .filter(Boolean)
    .filter((part) => !(part.startsWith("{") && part.endsWith("}")));
  for (const part of parts) {
    const tokens = tokenize(part);
    for (const token of tokens) {
      if (!ignored.has(token)) return token;
    }
  }
  return undefined;
}

function buildSdkVocabulary(methods: SdkMethodSurface[]): Set<string> {
  const vocab = new Set<string>();
  for (const method of methods) {
    for (const token of tokenize(`${method.namespace} ${method.methodName}`)) {
      vocab.add(token);
      vocab.add(singularize(token));
    }
    if (method.sourceFile) {
      for (const token of tokenize(method.sourceFile.replace(/\\/g, "/"))) {
        vocab.add(token);
        vocab.add(singularize(token));
      }
    }
  }
  return vocab;
}

function remediationFor(category: DriftCategory, highConfidence: boolean): string | undefined {
  if (!highConfidence) {
    if (category === "unsupported_resource") {
      return "Verify SDK/version coverage for this API resource before treating as drift.";
    }
    return "Review spec and SDK version alignment; this finding may be affected by heuristic matching.";
  }
  if (category === "missing_endpoint") return "Add or regenerate corresponding SDK method";
  if (category === "required_field_added") return "Regenerate SDK or add missing required parameter";
  if (category === "type_mismatch") return "Update SDK parameter type to match OpenAPI schema";
  return undefined;
}

export function computeDiff(
  operations: OperationSurface[],
  methods: SdkMethodSurface[],
  matches: MatchResult[]
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const sdkVocabulary = buildSdkVocabulary(methods);

  for (const match of matches) {
    const isHighConfidence = match.strategy === "exact" || match.strategy === "override" || match.confidence >= 0.75;
    if (!match.sdkMethodId) {
      const operation = operations.find((op) => op.operationId === match.operationId);
      const resource = operation ? operationResourceToken(operation.path) : undefined;
      const resourceSupported = resource
        ? sdkVocabulary.has(resource.toLowerCase()) || sdkVocabulary.has(singularize(resource.toLowerCase()))
        : true;
      const category: DriftCategory = resourceSupported ? "missing_endpoint" : "unsupported_resource";
      findings.push({
        id: `missing_${match.operationId}`,
        category,
        severity: severityFor(category),
        operationId: match.operationId,
        message:
          category === "unsupported_resource"
            ? `Operation ${match.operationId} appears to target an unsupported SDK resource`
            : `Operation ${match.operationId} is not represented in SDK`,
        remediation: remediationFor(category, isHighConfidence)
      });
      continue;
    }

    const operation = operations.find((op) => op.operationId === match.operationId);
    const method = methods.find((m) => m.id === match.sdkMethodId);
    if (!operation || !method) continue;
    if (usesParameterBag(method)) continue;

    const specParams = [...operation.pathParams, ...operation.queryParams];
    for (const specParam of specParams) {
      const sdkParam = findParam(method, specParam.name);
      if (!sdkParam && specParam.required) {
        findings.push({
          id: `required_${operation.operationId}_${specParam.name}`,
          category: "required_field_added",
          severity: severityFor("required_field_added"),
          operationId: operation.operationId,
          sdkMethodId: method.id,
          message: `Required parameter ${specParam.name} is missing in SDK method ${method.methodName}`,
          remediation: remediationFor("required_field_added", isHighConfidence)
        });
        continue;
      }

      if (!sdkParam) {
        findings.push({
          id: `changed_${operation.operationId}_${specParam.name}`,
          category: "changed_param",
          severity: severityFor("changed_param"),
          operationId: operation.operationId,
          sdkMethodId: method.id,
          message: `Parameter ${specParam.name} exists in spec but not in SDK method signature`
        });
        continue;
      }

      const specType = normalizeType(specParam.type?.name ?? specParam.type?.raw);
      const sdkType = normalizeType(sdkParam.type?.name ?? sdkParam.type?.raw);
      if (specType !== "unknown" && sdkType !== "unknown" && specType !== sdkType) {
        findings.push({
          id: `type_${operation.operationId}_${specParam.name}`,
          category: "type_mismatch",
          severity: severityFor("type_mismatch"),
          operationId: operation.operationId,
          sdkMethodId: method.id,
          message: `Type mismatch for ${specParam.name}: spec=${specType}, sdk=${sdkType}`,
          remediation: remediationFor("type_mismatch", isHighConfidence)
        });
      }
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
