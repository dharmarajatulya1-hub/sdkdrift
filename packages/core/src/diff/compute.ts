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
  if (category === "type_mismatch" || category === "changed_param") return "medium";
  return "low";
}

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
          remediation: "Regenerate SDK or add missing required parameter"
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
          remediation: "Update SDK parameter type to match OpenAPI schema"
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
