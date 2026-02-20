export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface TypeSurface {
  name: string;
  nullable?: boolean;
  raw?: string;
}

export interface ParameterSurface {
  name: string;
  in: "path" | "query" | "header" | "cookie" | "body";
  required: boolean;
  type?: TypeSurface;
}

export interface ResponseSurface {
  statusCode: string;
  type?: TypeSurface;
}

export interface OperationSurface {
  operationId: string;
  method: HttpMethod;
  path: string;
  pathParams: ParameterSurface[];
  queryParams: ParameterSurface[];
  requestBody?: TypeSurface;
  responses: ResponseSurface[];
  deprecated: boolean;
}

export interface SdkMethodSurface {
  id: string;
  namespace: string;
  methodName: string;
  params: ParameterSurface[];
  returnType?: TypeSurface;
  visibility: "public" | "private";
  sourceFile?: string;
  deprecated?: boolean;
}

export type DriftCategory =
  | "missing_endpoint"
  | "unsupported_resource"
  | "changed_param"
  | "required_field_added"
  | "type_mismatch"
  | "deprecated_mismatch"
  | "extra_sdk_method";

export interface DriftFinding {
  id: string;
  category: DriftCategory;
  severity: "critical" | "high" | "medium" | "low";
  operationId?: string;
  sdkMethodId?: string;
  message: string;
  remediation?: string;
}

export interface DriftReport {
  version: string;
  score: number;
  summary: {
    operationsTotal: number;
    operationsMatched: number;
    findingsTotal: number;
    actionableFindingsTotal?: number;
    coverageNotesTotal?: number;
    unmatchedReasons?: Partial<Record<UnmatchedReason, number>>;
  };
  deductions: Partial<Record<DriftCategory, number>>;
  findings: DriftFinding[];
  actionableFindings?: DriftFinding[];
  coverageNotes?: DriftFinding[];
}

export type UnmatchedReason =
  | "no_matching_resource_in_sdk"
  | "no_matching_action_in_resource"
  | "path_based_match_available"
  | "low_confidence_unmatched";

export interface MatchResult {
  operationId: string;
  sdkMethodId?: string;
  confidence: number;
  strategy: "exact" | "heuristic" | "override" | "path_fallback" | "unmatched";
  unmatchedReason?: UnmatchedReason;
}

export interface MatchOptions {
  overrides?: Record<string, string>;
  heuristicThreshold?: number;
}

export interface ScanOptions {
  specPathOrUrl: string;
  sdkPath: string;
  language: "python" | "ts";
  minScore?: number;
  match?: MatchOptions;
}
