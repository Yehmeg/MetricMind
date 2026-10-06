'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Database,
  ChevronDown,
  ChevronUp,
  Code,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import type { ConversationMessage } from '@/lib/conversation';
import type { QueryRequest, QueryResponse } from '@/types/api';
import { KPICards } from '../data-display/KPICards';
import { ChartContainer } from '../data-display/ChartContainer';
import { DataTable } from '../data-display/DataTable';
import { InspectionPanel } from './InspectionPanel';

interface MessageBubbleProps {
  message: ConversationMessage;
  onRetry: (id: string) => void;
  onInspect: (message: ConversationMessage) => void;
}

function formatTime(date: Date) {
  return format(date, 'HH:mm');
}

function formatContent(content: string): React.ReactNode {
  // Simple markdown-like formatting for AI responses
  const lines = content.split('\n');
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {lines.map((line, i) => (
        <p key={i} className="whitespace-pre-wrap text-foreground/90">
          {line === '' ? <br /> : line}
        </p>
      ))}
    </div>
  );
}

export function MessageBubble({ message, onRetry, onInspect }: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInspection, setShowInspection] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';
  const hasData = message.response && message.response.rows.length > 0;
  const hasPlan = message.plan && message.plan.status !== 'ready';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[75%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
          <div className="prose prose-sm dark:prose-invert max-w-none text-primary-foreground">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-xs text-primary-foreground/70">{formatTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex h-8 w-8 items-center justify-center flex-shrink-0 rounded-lg bg-muted">
        <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'rounded-2xl border p-4 transition-colors',
            'bg-card border-border',
            isError && 'border-destructive/30 bg-destructive/5',
            isStreaming && 'animate-pulse-soft'
          )}
        >
          {/* Clarification / Unsupported states */}
          {hasPlan && message.plan?.status === 'needs_clarification' && (
            <ClarificationBanner message={message.plan.message} />
          )}

          {hasPlan && message.plan?.status === 'unsupported' && (
            <UnsupportedBanner message={message.plan.message} />
          )}

          {/* Main content - AI explanation */}
          <div className={cn('text-foreground', isStreaming && 'text-muted-foreground')}>
            {message.content ? formatContent(message.content) : (
              isStreaming && <StreamingPlaceholder />
            )}
          </div>

          {/* Data visualization section */}
          {hasData && message.response && (
            <div className="mt-4 space-y-4 animate-slide-in">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors',
                    showDetails ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{showDetails ? 'Hide details' : 'Show details'}</span>
                </button>

                {message.query && (
                  <button
                    onClick={() => setShowInspection(!showInspection)}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Code className="h-4 w-4" />
                    <span>Inspect</span>
                  </button>
                )}

                {message.query && message.response && (
                  <button
                    onClick={() => handleCopy(JSON.stringify(message.query, null, 2))}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy API request"
                  >
                    <Copy className={cn('h-4 w-4', copied && 'text-primary')} />
                    <span>{copied ? 'Copied!' : 'Copy API'}</span>
                  </button>
                )}
              </div>

              {showDetails && (
                <ResponseDetails
                  response={message.response}
                  query={message.query}
                  onInspect={() => onInspect(message)}
                />
              )}

              {showInspection && message.query && message.response && (
                <InspectionPanel
                  message={{ query: message.query, response: message.response }}
                  onClose={() => setShowInspection(false)}
                />
              )}
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="mt-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
              <span className="text-sm text-destructive">{message.error || 'An error occurred'}</span>
              <button
                onClick={() => onRetry(message.id)}
                disabled={message.status === 'streaming'}
                className="ml-auto px-3 py-1.5 text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
            {isStreaming && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Generating response" />
            )}
            {message.status === 'sent' && (
              <Check className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClarificationBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-medium">Clarification needed</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}

function UnsupportedBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-medium">Question not supported</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}

function StreamingPlaceholder() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-5/6" />
    </div>
  );
}

function ResponseDetails({
  response,
  query,
  onInspect,
}: {
  response: QueryResponse;
  query?: QueryRequest;
  onInspect: () => void;
}) {
  const displayQuery = query || response.query;
  const { rows, metric_definitions, warnings, total_groups, truncated } = response;

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4 animate-fade-in">
      {rows.length > 0 && (
        <>
          <KPICards rows={rows} metrics={displayQuery.metrics} dimensions={displayQuery.dimensions} />
          <ChartContainer
            rows={rows}
            metrics={displayQuery.metrics}
            dimensions={displayQuery.dimensions}
          />
          <DataTable rows={rows} metrics={displayQuery.metrics} dimensions={displayQuery.dimensions} />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <QueryParamsCard query={displayQuery} />
        <ResultSummaryCard response={response} />
      </div>

      {Object.keys(metric_definitions).length > 0 && (
        <MetricDefinitionsCard definitions={metric_definitions} />
      )}

      {warnings.length > 0 && (
        <WarningsCard warnings={warnings} />
      )}

      <div className="pt-2 border-t border-border">
        <button
          onClick={onInspect}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <Code className="h-4 w-4" />
          <span>View Full Inspection Panel</span>
        </button>
      </div>
    </div>
  );
}

function QueryParamsCard({ query }: { query: QueryRequest }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
      <h4 className="text-sm font-medium text-foreground mb-3">Query Parameters</h4>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Metrics</dt>
          <dd className="font-mono text-foreground">{query.metrics.join(', ')}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Dimensions</dt>
          <dd className="font-mono text-foreground">{query.dimensions.join(', ') || 'None'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Date Range</dt>
          <dd className="font-mono text-foreground">{query.start_date} to {query.end_date}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Market Filter</dt>
          <dd className="font-mono text-foreground">{query.market || 'All markets'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Row Limit</dt>
          <dd className="font-mono text-foreground">{query.limit}</dd>
        </div>
      </dl>
    </div>
  );
}

function ResultSummaryCard({ response }: { response: QueryResponse }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
      <h4 className="text-sm font-medium text-foreground mb-3">Result Summary</h4>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd className={cn('font-mono', response.status === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400')}>
            {response.status}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Groups Returned</dt>
          <dd className="font-mono text-foreground">{response.total_groups}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Truncated</dt>
          <dd className={cn('font-mono', response.truncated ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')}>
            {response.truncated ? 'Yes' : 'No'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Request ID</dt>
          <dd className="font-mono text-foreground">{response.request_id.slice(0, 8)}...</dd>
        </div>
      </dl>
    </div>
  );
}

function MetricDefinitionsCard({ definitions }: { definitions: Record<string, string> }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
      <h4 className="text-sm font-medium text-foreground mb-3">Metric Definitions</h4>
      <dl className="space-y-3 text-sm">
        {Object.entries(definitions).map(([metric, definition]) => (
          <div key={metric} className="space-y-1">
            <dt className="font-medium text-foreground capitalize">{metric.replace(/_/g, ' ')}</dt>
            <dd className="text-muted-foreground font-mono text-xs bg-background p-2 rounded border border-border/50">
              {definition}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function WarningsCard({ warnings }: { warnings: string[] }) {
  return (
    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4" />
        Warnings
      </h4>
      <ul className="text-sm space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span>•</span> {w}
          </li>
        ))}
      </ul>
    </div>
  );
}