import SwaggerParser from "@apidevtools/swagger-parser";
import type { OperationSurface, ParameterSurface, ResponseSurface, TypeSurface } from "../types/contracts.js";

type OpenApiParameter = {
  name?: unknown;
  in?: unknown;
  required?: unknown;
  schema?: Record<string, unknown>;
};

function fromSchema(
  schema: Record<string, unknown> | undefined,
  contentType?: string
): TypeSurface | undefined {
  if (!schema) return undefined;
  if (typeof schema.$ref === "string") {
    const parts = schema.$ref.split("/");
    return { name: parts[parts.length - 1] ?? "unknown", raw: schema.$ref, contentType };
  }
  if (typeof schema.type === "string") {
    return { name: schema.type, nullable: Boolean(schema.nullable), contentType };
  }
  return undefined;
}

function parseParameters(parameters: unknown[]): ParameterSurface[] {
  const output: ParameterSurface[] = [];
  for (const raw of parameters) {
    const param = (raw ?? {}) as OpenApiParameter;
    if (typeof param.name !== "string") continue;
    const location = param.in;
    if (!["path", "query", "header", "cookie"].includes(String(location))) continue;
    output.push({
      name: param.name,
      in: location as ParameterSurface["in"],
      required: Boolean(param.required),
      type: fromSchema(param.schema)
    });
  }
  return output;
}

function preferredResponseEntry(
  rawResponses: Record<string, unknown> | undefined
): [string, unknown] | undefined {
  if (!rawResponses) return undefined;
  const entries = Object.entries(rawResponses);
  if (!entries.length) return undefined;

  const direct = ["200", "201", "204"].find((status) => status in rawResponses);
  if (direct) return [direct, rawResponses[direct]];

  const twoXX = entries.find(([status]) => /^[2]..$/.test(status));
  if (twoXX) return twoXX;

  return entries[0];
}

function preferredContentType(
  content: Record<string, { schema?: Record<string, unknown> }> | undefined
): [string, { schema?: Record<string, unknown> }] | undefined {
  if (!content) return undefined;
  if (content["application/json"]) return ["application/json", content["application/json"]];
  const entries = Object.entries(content);
  return entries[0];
}

function parseResponses(rawResponses: Record<string, unknown> | undefined): ResponseSurface[] {
  if (!rawResponses) return [];
  const selected = preferredResponseEntry(rawResponses);
  if (!selected) return [];
  const [statusCode, raw] = selected;
  const response = (raw ?? {}) as {
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  const content = preferredContentType(response.content);
  return [
    {
      statusCode,
      type: fromSchema(content?.[1]?.schema, content?.[0])
    }
  ];
}

export async function parseOpenApi(specPathOrUrl: string): Promise<OperationSurface[]> {
  const api = (await SwaggerParser.dereference(specPathOrUrl)) as {
    paths?: Record<string, Record<string, unknown> & { parameters?: unknown[] }>;
  };

  const results: OperationSurface[] = [];
  const paths = api.paths ?? {};

  for (const [path, methods] of Object.entries(paths)) {
    const pathLevelParams = parseParameters(Array.isArray(methods.parameters) ? methods.parameters : []);
    for (const [method, rawOp] of Object.entries(methods)) {
      const m = method.toLowerCase();
      if (!["get", "post", "put", "patch", "delete"].includes(m)) continue;
      const op = (rawOp ?? {}) as Record<string, unknown> & {
        parameters?: unknown[];
        requestBody?: { content?: Record<string, { schema?: Record<string, unknown> }> };
        responses?: Record<string, unknown>;
      };
      const operationId = typeof op.operationId === "string" ? op.operationId : `${m}_${path}`;
      const opParams = parseParameters(Array.isArray(op.parameters) ? op.parameters : []);
      const allParams = [...pathLevelParams, ...opParams];
      const requestBodyContent = preferredContentType(op.requestBody?.content);

      results.push({
        operationId,
        method: m as OperationSurface["method"],
        path,
        pathParams: allParams.filter((p) => p.in === "path"),
        queryParams: allParams.filter((p) => p.in === "query"),
        requestBody: fromSchema(requestBodyContent?.[1]?.schema, requestBodyContent?.[0]),
        responses: parseResponses(op.responses),
        deprecated: Boolean(op.deprecated)
      });
    }
  }

  return results;
}
