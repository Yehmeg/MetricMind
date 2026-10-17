export type Metric =
  | 'revenue'
  | 'reported_profit'
  | 'reported_profit_margin'
  | 'shipping_cost';

export type Dimension = 'market' | 'category';

export interface QueryRequest {
  metrics: Metric[];
  dimensions: Dimension[];
  start_date: string;
  end_date: string;
  market?: 'EU' | 'US' | 'LATAM' | 'Africa' | 'APAC' | 'EMEA' | 'Canada' | null;
  limit?: number;
}

export interface QueryResponse {
  request_id: string;
  status: 'ok' | 'no_data';
  source: 'mock_fixture';
  dataset_version: string;
  contract_version: string;
  query: QueryRequest;
  rows: Record<string, string | null>[];
  total_groups: number;
  truncated: boolean;
  metric_definitions: Record<string, string>;
  warnings: string[];
}

export interface PlanRequest {
  question: string;
}

export interface PlanResponse {
  status: 'ready' | 'needs_clarification' | 'unsupported';
  planner_mode: 'rules_v1';
  query: QueryRequest | null;
  message: string;
}

export interface MetricsCatalogResponse {
  metrics: Record<string, string>;
  dimensions: string[];
  date_bounds: string;
  mode: string;
  max_window_days: number;
  max_rows: number;
}

export interface HealthResponse {
  status: string;
  mode: string;
  contract_version: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  query?: QueryRequest;
  response?: QueryResponse;
  plan?: PlanResponse;
  isStreaming?: boolean;
  error?: string;
}

export interface VisualizationData {
  type: 'kpi' | 'line' | 'bar' | 'table' | 'comparison';
  title: string;
  data: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: Dimension[];
  xKey?: string;
  yKeys?: string[];
}

export interface InspectionData {
  apiCall: QueryRequest;
  sql?: string;
  metricDefinitions: Record<string, string>;
  warnings: string[];
}