import SwaggerParser from "@apidevtools/swagger-parser";
import type { OperationSurface, ParameterSurface, ResponseSurface, TypeSurface } from "../types/contracts.js";

type OpenApiParameter = {
  name?: unknown;
  in?: unknown;
  required?: unknown;
  schema?: Record<string, unknown>;
};

function fromSchema(schema: Record<string, unknown> | undefined): TypeSurface | undefined {
  if (!schema) return undefined;
  if (typeof schema.$ref === "string") {
    const parts = schema.$ref.split("/");
    return { name: parts[parts.length - 1] ?? "unknown", raw: schema.$ref };
  }
  if (typeof schema.type === "string") {
    return { name: schema.type, nullable: Boolean(schema.nullable) };
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

function parseResponses(rawResponses: Record<string, unknown> | undefined): ResponseSurface[] {
  if (!rawResponses) return [];
  const responses: ResponseSurface[] = [];
  for (const [statusCode, raw] of Object.entries(rawResponses)) {
    const response = (raw ?? {}) as {
      content?: Record<string, { schema?: Record<string, unknown> }>;
    };
    const firstContent = response.content ? Object.values(response.content)[0] : undefined;
    responses.push({
      statusCode,
      type: fromSchema(firstContent?.schema)
    });
  }
  return responses;
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
      const requestBodyContent = op.requestBody?.content ? Object.values(op.requestBody.content)[0] : undefined;

      results.push({
        operationId,
        method: m as OperationSurface["method"],
        path,
        pathParams: allParams.filter((p) => p.in === "path"),
        queryParams: allParams.filter((p) => p.in === "query"),
        requestBody: fromSchema(requestBodyContent?.schema),
        responses: parseResponses(op.responses),
        deprecated: Boolean(op.deprecated)
      });
    }
  }

  return results;
}
