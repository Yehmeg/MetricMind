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

  query: (request: QueryRequest) => {
    assertValidQueryRequest(request);
    return fetch(`${API_BASE}/api/v1/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(handleResponse<QueryResponse>);
  },

  queryStream: async function* (request: QueryRequest): AsyncGenerator<QueryResponse, void, unknown> {
    assertValidQueryRequest(request);
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

  sql: async (requestId: string): Promise<SqlInspectionResult> => {
    const res = await fetch(`${API_BASE}/api/v1/sql/${requestId}`, { cache: 'no-store' });
    if (res.status === 404) {
      return { available: false, reason: SQL_INSPECTION_UNAVAILABLE };
    }
    const data = await handleResponse<{ sql: string; params?: unknown[] }>(res);
    return { available: true, sql: data.sql, params: data.params };
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

export type SqlInspectionResult =
  | { available: true; sql: string; params?: unknown[] }
  | { available: false; reason: string };

export const SQL_INSPECTION_UNAVAILABLE =
  'SQL inspection is unavailable because the current backend does not expose this endpoint.';

export type { ApiError };

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Runtime allowlists mirrored from backend/app/contracts.py (contract v0.1).
 * Update only when the backend contract itself changes.
 */
export const BACKEND_CONTRACT = {
  metrics: ['revenue', 'reported_profit', 'reported_profit_margin', 'shipping_cost'] as Metric[],
  dimensions: ['market', 'category'] as Dimension[],
  markets: ['EU', 'US', 'LATAM', 'Africa', 'APAC', 'EMEA', 'Canada'] as NonNullable<QueryRequest['market']>[],
  maxMetrics: 4,
  maxDimensions: 2,
  maxWindowDays: 366,
  limitMin: 1,
  limitMax: 1000,
} as const;

function isISOCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function dateToUTC(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Validates a query request against the backend contract before any network
 * request is made. Returns ordered, field-specific, actionable errors.
 */
export function validateQueryRequest(request: Partial<QueryRequest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const metrics = request.metrics;
  if (!Array.isArray(metrics) || metrics.length === 0) {
    errors.push('metrics: at least one metric is required');
  } else {
    if (metrics.length > BACKEND_CONTRACT.maxMetrics) {
      errors.push(`metrics: at most ${BACKEND_CONTRACT.maxMetrics} metrics are supported (got ${metrics.length})`);
    }
    const unsupported = metrics.filter(metric => !BACKEND_CONTRACT.metrics.includes(metric));
    if (unsupported.length > 0) {
      errors.push(`metrics: unsupported metric(s) ${unsupported.join(', ')}; supported metrics are ${BACKEND_CONTRACT.metrics.join(', ')}`);
    }
    if (new Set(metrics).size !== metrics.length) {
      errors.push('metrics: duplicate metrics are not allowed');
    }
  }

  const dimensions = request.dimensions;
  if (Array.isArray(dimensions)) {
    if (dimensions.length > BACKEND_CONTRACT.maxDimensions) {
      errors.push(`dimensions: at most ${BACKEND_CONTRACT.maxDimensions} dimensions are supported (got ${dimensions.length})`);
    }
    const unsupportedDims = dimensions.filter(dimension => !BACKEND_CONTRACT.dimensions.includes(dimension));
    if (unsupportedDims.length > 0) {
      errors.push(`dimensions: unsupported dimension(s) ${unsupportedDims.join(', ')}; supported dimensions are ${BACKEND_CONTRACT.dimensions.join(', ')}`);
    }
    if (new Set(dimensions).size !== dimensions.length) {
      errors.push('dimensions: duplicate dimensions are not allowed');
    }
  }

  if (request.market != null && !BACKEND_CONTRACT.markets.includes(request.market)) {
    errors.push(`market: unsupported market "${request.market}"; supported markets are ${BACKEND_CONTRACT.markets.join(', ')}, or null for all markets`);
  }

  const startDate = typeof request.start_date === 'string' ? request.start_date : undefined;
  const endDate = typeof request.end_date === 'string' ? request.end_date : undefined;

  if (!startDate || !isISOCalendarDate(startDate)) {
    errors.push('start_date: a valid ISO calendar date is required (format YYYY-MM-DD)');
  }
  if (!endDate || !isISOCalendarDate(endDate)) {
    errors.push('end_date: a valid ISO calendar date is required (format YYYY-MM-DD)');
  }

  if (startDate && endDate && isISOCalendarDate(startDate) && isISOCalendarDate(endDate)) {
    if (dateToUTC(startDate) > dateToUTC(endDate)) {
      errors.push(`start_date: ${startDate} must be on or before end_date: ${endDate}`);
    } else {
      const windowDays = Math.round((dateToUTC(endDate).getTime() - dateToUTC(startDate).getTime()) / 86400000);
      if (windowDays > BACKEND_CONTRACT.maxWindowDays) {
        errors.push(`start_date/end_date: query window is ${windowDays} days; the backend allows at most ${BACKEND_CONTRACT.maxWindowDays} days`);
      }
    }
  }

  const limit = request.limit;
  if (limit !== undefined) {
    if (!Number.isInteger(limit)) {
      errors.push(`limit: must be an integer between ${BACKEND_CONTRACT.limitMin} and ${BACKEND_CONTRACT.limitMax}`);
    } else if (limit < BACKEND_CONTRACT.limitMin || limit > BACKEND_CONTRACT.limitMax) {
      errors.push(`limit: must be an integer between ${BACKEND_CONTRACT.limitMin} and ${BACKEND_CONTRACT.limitMax} (got ${limit})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function assertValidQueryRequest(request: QueryRequest): void {
  const validation = validateQueryRequest(request);
  if (!validation.valid) {
    throw new ValidationError(
      `Invalid query request (not sent to the backend): ${validation.errors.join('; ')}`,
      validation.errors
    );
  }
}

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