'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Copy, Code, FileText, AlertTriangle, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueryRequest, QueryResponse } from '@/types/api';

interface InspectionPanelProps {
  message: {
    query?: QueryRequest;
    response?: QueryResponse;
  };
  onClose: () => void;
}

export function InspectionPanel({ message, onClose }: InspectionPanelProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'metrics' | 'warnings' | 'sql'>('api');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const query = message.query;
  const response = message.response;

  if (!query || !response) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-card rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
          <p className="text-muted-foreground">No inspection data available</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-foreground">Query Inspection</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close inspection panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 sticky top-[56px] bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 z-10">
          {[
            { id: 'api', label: 'API Call', icon: Code },
            { id: 'sql', label: 'Generated SQL', icon: Database },
            { id: 'metrics', label: 'Metric Definitions', icon: FileText },
            { id: 'warnings', label: 'Warnings', icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <tab.icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'api' && (
            <APICallView query={query} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'sql' && (
            <SQLView query={query} response={response} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'metrics' && (
            <MetricDefinitionsView definitions={response.metric_definitions} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'warnings' && (
            <WarningsView warnings={response.warnings} />
          )}
        </div>
      </div>
    </div>
  );
}

function APICallView({ query, onCopy, copied }: { query: QueryRequest; onCopy: (text: string, label: string) => void; copied: string | null }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sections: Array<{ key: string; label: string; value: string | string[] | number }> = [
    { key: 'metrics', label: 'Metrics', value: query.metrics },
    { key: 'dimensions', label: 'Dimensions', value: query.dimensions },
    { key: 'start_date', label: 'Start Date', value: query.start_date },
    { key: 'end_date', label: 'End Date', value: query.end_date },
    { key: 'market', label: 'Market Filter', value: query.market || 'All markets' },
    { key: 'limit', label: 'Row Limit', value: query.limit ?? 100 },
  ];

  const fullRequest = JSON.stringify(query, null, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Semantic API Request</h3>
        <button
          onClick={() => onCopy(fullRequest, 'API Request')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors',
            copied === 'API Request'
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-accent border-border text-foreground hover:bg-accent/50'
          )}
        >
          <Copy className="w-4 h-4" />
          {copied === 'API Request' ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>

      <div className="rounded-lg p-4 font-mono text-sm overflow-x-auto bg-muted/50 border border-border/50">
        <pre className="text-foreground">{fullRequest}</pre>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-foreground">Parsed Parameters</h4>
        {sections.map(section => {
          const isArray = Array.isArray(section.value);
          const isExpanded = expanded[section.key];
          const displayValue = isArray
            ? (section.value as string[]).join(', ')
            : String(section.value);
          const shouldTruncate = displayValue.length > 100;

          return (
            <div key={section.key} className="rounded-lg p-3 bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{section.label}</span>
                  {isArray && (section.value as string[]).length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      {(section.value as string[]).length}
                    </span>
                  )}
                </div>
                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [section.key]: !isExpanded }))}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
              <div className={cn('mt-2 font-mono text-sm text-foreground break-all', shouldTruncate && !isExpanded && 'line-clamp-2')}>
                {displayValue || '<empty>'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SQLView({ query, response, onCopy, copied }: { query: QueryRequest; response: QueryResponse; onCopy: (text: string, label: string) => void; copied: string | null }) {
  // In the mock backend, SQL is not generated. This would come from the Semantic Layer in production.
  const exampleSQL = generateExampleSQL(query);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Generated SQL</h3>
        <button
          onClick={() => onCopy(exampleSQL, 'SQL')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors',
            copied === 'SQL'
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-accent border-border text-foreground hover:bg-accent/50'
          )}
        >
          <Copy className="w-4 h-4" />
          {copied === 'SQL' ? 'Copied!' : 'Copy SQL'}
        </button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">SQL</span>
          <span>Mock backend - example generated SQL</span>
        </div>
        <pre className="p-4 font-mono text-sm text-foreground overflow-x-auto">{exampleSQL}</pre>
      </div>

      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Database className="w-4 h-4" />
          <span className="font-medium">Note</span>
        </div>
        <p className="text-sm text-primary">
          SQL generation is handled by the Semantic Layer (Cube.dev/dbt) and is not available in the mock backend.
          In the production integration, the compiled SQL would be displayed here.
        </p>
      </div>
    </div>
  );
}

function generateExampleSQL(query: QueryRequest): string {
  const metrics = query.metrics.map(m => {
    switch (m) {
      case 'revenue': return 'SUM(sales) as revenue';
      case 'reported_profit': return 'SUM(profit) as reported_profit';
      case 'reported_profit_margin': return '100 * SUM(profit) / NULLIF(SUM(sales), 0) as reported_profit_margin';
      case 'shipping_cost': return 'SUM(shipping_cost) as shipping_cost';
      default: return m;
    }
  }).join(', ');

  const dimensions = query.dimensions.join(', ');
  const groupBy = dimensions ? `GROUP BY ${dimensions}` : '';
  const orderBy = dimensions ? `ORDER BY ${dimensions}` : '';
  const where = [];
  
  where.push(`order_date BETWEEN '${query.start_date}' AND '${query.end_date}'`);
  if (query.market) where.push(`market = '${query.market}'`);
  
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return `-- Generated by MetricMind Semantic Layer
SELECT ${dimensions ? dimensions + ', ' : ''}${metrics}
FROM superstore_facts
${whereClause}
${groupBy}
${orderBy}
LIMIT ${query.limit};`;
}

function MetricDefinitionsView({ 
  definitions, 
  onCopy, 
  copied 
}: { 
  definitions: Record<string, string>;
  onCopy: (text: string, label: string) => void;
  copied: string | null;
}) {
  if (Object.keys(definitions).length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>No metric definitions available</p>
      </div>
    );
  }

  const allDefinitions = Object.entries(definitions).map(([metric, def]) => `${metric}: ${def}`).join('\n\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Governed Metric Definitions</h3>
        <button
          onClick={() => onCopy(allDefinitions, 'All Definitions')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors',
            copied === 'All Definitions'
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-accent border-border text-foreground hover:bg-accent/50'
          )}
        >
          <Copy className="w-4 h-4" />
          {copied === 'All Definitions' ? 'Copied!' : 'Copy All'}
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(definitions).map(([metric, definition]) => (
          <div key={metric} className="rounded-lg p-4 bg-muted/30 border border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-foreground text-lg">{getMetricLabel(metric)}</span>
                  <span className="px-2 py-0.5 text-xs font-mono bg-muted text-muted-foreground rounded">{metric}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCopy(definition, metric)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition-colors',
                      copied === metric
                        ? 'bg-green-500/10 border-green-500 text-green-500'
                        : 'bg-accent border-border text-foreground hover:bg-accent/50'
                    )}
                  >
                    <Copy className="w-4 h-4" />
                    {copied === metric ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-background border border-border/50 font-mono text-sm text-muted-foreground">
              {definition}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          About Metric Definitions
        </h4>
        <p className="text-sm text-primary/80">
          These definitions come from the Semantic Layer (Cube.dev/dbt) and represent the single source of truth 
          for how each metric is calculated. The LLM agent selects from these approved metrics but cannot modify 
          their formulas. This ensures consistent calculations across all analyses.
        </p>
      </div>
    </div>
  );
}

function WarningsView({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-green-500">No warnings for this query</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-foreground">Query Warnings</h3>
      <p className="text-sm text-muted-foreground">
        Warnings indicate potential issues with the query results that you should be aware of.
      </p>
      <div className="space-y-2">
        {warnings.map((warning, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm">{warning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getMetricLabel(metric: string): string {
  switch (metric) {
    case 'revenue': return 'Revenue';
    case 'reported_profit': return 'Profit';
    case 'reported_profit_margin': return 'Profit Margin';
    case 'shipping_cost': return 'Shipping Cost';
    default: return metric;
  }
}