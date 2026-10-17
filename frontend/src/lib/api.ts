import type {
  QueryRequest,
  QueryResponse,
  PlanRequest,
  PlanResponse,
  HealthResponse,
  MetricsCatalogResponse,
  Metric,
  Dimension,
} from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(
      error.detail || `HTTP ${res.status}`,
      res.status,
      error.code,
      error
    );
  }
  return res.json();
}

export const api = {
  health: () => fetch(`${API_BASE}/health`, { cache: 'no-store' }).then(handleResponse<HealthResponse>),

  metrics: () =>
    fetch(`${API_BASE}/api/v1/metrics`, { cache: 'no-store' }).then(handleResponse<MetricsCatalogResponse>),

  plan: (question: string) =>
    fetch(`${API_BASE}/api/v1/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question } satisfies PlanRequest),
    }).then(handleResponse<PlanResponse>),

  query: (request: QueryRequest) =>
    fetch(`${API_BASE}/api/v1/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(handleResponse<QueryResponse>),

  queryStream: async function* (request: QueryRequest): AsyncGenerator<QueryResponse, void, unknown> {
    const res = await fetch(`${API_BASE}/api/v1/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Query failed' }));
      throw new ApiError(error.detail || 'Query failed', res.status, error.code, error);
    }
    const data = await res.json();
    yield data as QueryResponse;
  },

  sql: async (requestId: string): Promise<{ sql: string; params?: unknown[] }> => {
    const res = await fetch(`${API_BASE}/api/v1/sql/${requestId}`, { cache: 'no-store' });
    if (res.status === 404) {
      return { sql: '-- SQL not available in mock backend. In production, this would show the compiled query from the Semantic Layer.' };
    }
    return handleResponse<{ sql: string; params?: unknown[] }>(res);
  },

  trace: async (requestId: string): Promise<{
    request_id: string;
    steps: Array<{ step: string; query: QueryRequest; response: QueryResponse; duration_ms: number }>;
  }> => {
    const res = await fetch(`${API_BASE}/api/v1/trace/${requestId}`, { cache: 'no-store' });
    if (res.status === 404) {
      return { request_id: requestId, steps: [] };
    }
    return handleResponse(res);
  },
};

export type { ApiError };

export function createQueryRequest(params: {
  metrics: Metric[];
  dimensions: Dimension[];
  start_date: string;
  end_date: string;
  market?: QueryRequest['market'];
  limit?: number;
}): QueryRequest {
  return {
    metrics: params.metrics,
    dimensions: params.dimensions,
    start_date: params.start_date,
    end_date: params.end_date,
    market: params.market ?? null,
    limit: params.limit ?? 100,
  };
}

export function validateQueryRequest(request: Partial<QueryRequest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.metrics?.length) errors.push('At least one metric is required');
  if (request.metrics && request.metrics.length > 4) errors.push('Maximum 4 metrics allowed');
  if (request.dimensions && request.dimensions.length > 2) errors.push('Maximum 2 dimensions allowed');
  if (!request.start_date) errors.push('Start date is required');
  if (!request.end_date) errors.push('End date is required');
  if (request.start_date && request.end_date && new Date(request.start_date) > new Date(request.end_date)) {
    errors.push('Start date must be before or equal to end date');
  }
  if (request.start_date && request.end_date) {
    const diff = new Date(request.end_date).getTime() - new Date(request.start_date).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days > 366) errors.push('Query window may not exceed 366 days');
  }
  if (request.limit && (request.limit < 1 || request.limit > 1000)) {
    errors.push('Limit must be between 1 and 1000');
  }
  return { valid: errors.length === 0, errors };
}