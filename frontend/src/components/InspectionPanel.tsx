'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Copy, Code, FileText, AlertTriangle, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InspectionData, QueryRequest } from '@/types/api';

interface InspectionPanelProps {
  data: InspectionData;
  onClose: () => void;
}

export function InspectionPanel({ data, onClose }: InspectionPanelProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'metrics' | 'warnings'>('api');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Query Inspection</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 sticky top-[56px] bg-white z-10">
          {[
            { id: 'api', label: 'API Call', icon: Code },
            { id: 'metrics', label: 'Metric Definitions', icon: FileText },
            { id: 'warnings', label: 'Warnings', icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'api' && (
            <APICallView data={data} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'metrics' && (
            <MetricDefinitionsView definitions={data.metricDefinitions} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'warnings' && (
            <WarningsView warnings={data.warnings} />
          )}
        </div>
      </div>
    </div>
  );
}

function APICallView({ data, onCopy, copied }: { data: InspectionData; onCopy: (text: string, label: string) => void; copied: string | null }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const query = data.apiCall;
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
        <h3 className="font-medium text-gray-900">Semantic API Request</h3>
        <button
          onClick={() => onCopy(fullRequest, 'API Request')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors',
            copied === 'API Request' 
              ? 'bg-green-100 border-green-300 text-green-700' 
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
          )}
        >
          <Copy className="w-4 h-4" />
          {copied === 'API Request' ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
        <pre className="text-gray-800">{fullRequest}</pre>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Parsed Parameters</h4>
        {sections.map(section => {
          const isArray = Array.isArray(section.value);
          const isExpanded = expanded[section.key];
          const displayValue = isArray 
            ? (section.value as string[]).join(', ') 
            : String(section.value);
          const shouldTruncate = displayValue.length > 100;

          return (
            <div key={section.key} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">{section.label}</span>
                  {isArray && (section.value as string[]).length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {(section.value as string[]).length}
                    </span>
                  )}
                </div>
                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [section.key]: !isExpanded }))}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
              <div className={cn('mt-2 font-mono text-sm text-gray-900 break-all', shouldTruncate && !isExpanded && 'line-clamp-2')}>
                {displayValue || '<empty>'}
              </div>
            </div>
          );
        })}

        {/* SQL Section (placeholder since mock doesn't generate SQL) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 mb-2">
            <Database className="w-4 h-4" />
            <span className="font-medium">Generated SQL</span>
          </div>
          <p className="text-sm text-yellow-700">
            SQL generation is handled by the Semantic Layer (Cube.dev/dbt) and is not available in the mock backend.
            In the production integration, the compiled SQL would be displayed here.
          </p>
          <div className="mt-3 p-3 bg-white rounded border border-yellow-200 font-mono text-xs text-gray-500">
            -- Example of what SQL might look like:
            -- SELECT market, category, SUM(sales) as revenue, SUM(profit) as reported_profit
            -- FROM superstore_facts
            -- WHERE order_date BETWEEN '2014-10-01' AND '2014-12-31'
            --   AND market = 'EU'
            -- GROUP BY market, category
            -- ORDER BY market, category
            -- LIMIT 100
          </div>
        </div>
      </div>
    </div>
  );
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
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No metric definitions available</p>
      </div>
    );
  }

  const allDefinitions = Object.entries(definitions).map(([metric, def]) => `${metric}: ${def}`).join('\n\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Governed Metric Definitions</h3>
        <button
          onClick={() => onCopy(allDefinitions, 'All Definitions')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors',
            copied === 'All Definitions'
              ? 'bg-green-100 border-green-300 text-green-700'
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
          )}
        >
          <Copy className="w-4 h-4" />
          {copied === 'All Definitions' ? 'Copied!' : 'Copy All'}
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(definitions).map(([metric, definition]) => (
          <div key={metric} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900 text-lg">{getMetricLabel(metric)}</span>
                  <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded">{metric}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCopy(definition, metric)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition-colors',
                      copied === metric
                        ? 'bg-green-100 border-green-300 text-green-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Copy className="w-4 h-4" />
                    {copied === metric ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-700 border border-gray-200">
              {definition}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          About Metric Definitions
        </h4>
        <p className="text-sm text-blue-700">
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
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-green-600">No warnings for this query</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">Query Warnings</h3>
      <p className="text-sm text-gray-500">
        Warnings indicate potential issues with the query results that you should be aware of.
      </p>
      <div className="space-y-2">
        {warnings.map((warning, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{warning}</p>
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