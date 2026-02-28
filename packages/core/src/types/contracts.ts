export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface TypeSurface {
  name: string;
  nullable?: boolean;
  raw?: string;
  contentType?: string;
}

export interface ParameterSurface {
  name: string;
  in: "path" | "query" | "header" | "cookie" | "body" | "unknown";
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
  methodKind?: "class_method" | "function" | "factory" | "extend_method" | "utility";
  scannerConfidence?: number;
  provenance?: {
    strategy?: string;
    pathTemplate?: string;
  };
}

export type DriftCategory =
  | "missing_endpoint"
  | "unsupported_resource"
  | "param_not_explicit"
  | "changed_param"
  | "required_field_added"
  | "type_mismatch"
  | "deprecated_mismatch"
  | "extra_sdk_method";

export interface DriftFinding {
  id: string;
  category: DriftCategory;
  severity: "critical" | "high" | "medium" | "low";
  ruleId?: string;
  confidence?: number;
  isActionable?: boolean;
  evidence?: Record<string, unknown>;
  operationId?: string;
  sdkMethodId?: string;
  message: string;
  remediation?: string;
}

export interface DriftReport {
  version: string;
  score: number;
  scores?: {
    actionable: number;
    coverage: number;
  };
  summary: {
    operationsTotal: number;
    operationsMatched: number;
    findingsTotal: number;
    actionableFindingsTotal?: number;
    coverageNotesTotal?: number;
    unmatchedReasons?: Partial<Record<UnmatchedReason, number>>;
  };
  deductions: Partial<Record<DriftCategory, number>>;
  weightedDeductions?: Partial<Record<DriftCategory, number>>;
  categoryCounts?: Partial<Record<DriftCategory, number>>;
  weightedImpact?: Partial<Record<DriftCategory, number>>;
  findings: DriftFinding[];
  actionableFindings?: DriftFinding[];
  coverageNotes?: DriftFinding[];
}

export type UnmatchedReason =
  | "no_matching_resource_in_sdk"
  | "no_matching_action_in_resource"
  | "path_based_match_available"
  | "low_confidence_unmatched"
  | "ambiguous_top_candidates"
  | "scanner_low_evidence"
  | "resource_missing"
  | "action_missing";

export interface MatchResult {
  operationId: string;
  sdkMethodId?: string;
  confidence: number;
  evidence?: Record<string, unknown>;
  candidates?: Array<{ sdkMethodId: string; confidence: number }>;
  strategy: "exact" | "heuristic" | "override" | "path_fallback" | "unmatched";
  unmatchedReason?: UnmatchedReason;
}

export interface MatchOptions {
  overrides?: Record<string, string>;
  heuristicThreshold?: number;
  mode?: "precision" | "balanced" | "recall";
  minConfidenceActionable?: number;
  minTop2Margin?: number;
  abstainOverGuess?: boolean;
}

export interface DiffOptions {
  ignoreExtraMethods?: string[];
}

export interface ScanOptions {
  specPathOrUrl: string;
  sdkPath: string;
  language: "python" | "ts";
  minScore?: number;
  match?: MatchOptions;
  diff?: DiffOptions;
}
