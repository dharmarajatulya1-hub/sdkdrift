import SwaggerParser from "@apidevtools/swagger-parser";
import type { OperationSurface } from "../types/contracts.js";

export async function parseOpenApi(specPathOrUrl: string): Promise<OperationSurface[]> {
  const api = (await SwaggerParser.dereference(specPathOrUrl)) as {
    paths?: Record<string, Record<string, unknown>>;
  };

  const results: OperationSurface[] = [];
  const paths = api.paths ?? {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, rawOp] of Object.entries(methods)) {
      const m = method.toLowerCase();
      if (!["get", "post", "put", "patch", "delete"].includes(m)) continue;
      const op = (rawOp ?? {}) as Record<string, unknown>;
      const operationId = typeof op.operationId === "string" ? op.operationId : `${m}_${path}`;

      results.push({
        operationId,
        method: m as OperationSurface["method"],
        path,
        pathParams: [],
        queryParams: [],
        requestBody: undefined,
        responses: [],
        deprecated: Boolean(op.deprecated)
      });
    }
  }

  return results;
}
