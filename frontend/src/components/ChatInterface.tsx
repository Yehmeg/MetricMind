'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, AlertCircle, ChevronDown, ChevronUp, Code, Database, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, QueryRequest, QueryResponse, PlanResponse, VisualizationData, InspectionData } from '@/types/api';
import { KPICards } from './KPICards';
import { ChartContainer } from './ChartContainer';
import { DataTable } from './DataTable';
import { InspectionPanel } from './InspectionPanel';

const EXAMPLE_QUESTIONS = [
  'Show EU revenue and profit for Q4 2014 by category',
  'Show all markets revenue for Q4 2014',
  'Show US profit margin for Q3 2014 by category',
  'Show EU shipping cost for Q4 2014 by category',
];

interface ChatInterfaceProps {
  onQuery?: (query: QueryRequest) => Promise<QueryResponse>;
  onPlan?: (question: string) => Promise<PlanResponse>;
}

export function ChatInterface({ onQuery, onPlan }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [activeInspection, setActiveInspection] = useState<InspectionData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setShowExamples(false);
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      const plan = await onPlan?.(question);
      
      if (plan?.status === 'needs_clarification') {
        const clarificationMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: plan.message,
          timestamp: new Date(),
          plan,
        };
        setMessages(prev => [...prev, clarificationMessage]);
        setIsLoading(false);
        return;
      }

      if (plan?.status === 'unsupported') {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: plan.message,
          timestamp: new Date(),
          plan,
          error: 'unsupported',
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      if (plan?.query && onQuery) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          query: plan.query,
          isStreaming: true,
        };
        setMessages(prev => [...prev, assistantMessage]);

        try {
          const response = await onQuery(plan.query);
          
          const completeMessage: ChatMessage = {
            ...assistantMessage,
            content: generateResponseText(response),
            response,
            plan,
            isStreaming: false,
          };
          setMessages(prev => prev.map(m => m.id === assistantMessage.id ? completeMessage : m));
        } catch (error) {
          const errorMessage: ChatMessage = {
            ...assistantMessage,
            content: `Error: ${error instanceof Error ? error.message : 'Failed to execute query'}`,
            error: 'execution',
            isStreaming: false,
          };
          setMessages(prev => prev.map(m => m.id === assistantMessage.id ? errorMessage : m));
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to plan query'}`,
        timestamp: new Date(),
        error: 'planning',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleInspect = (data: InspectionData) => {
    setActiveInspection(data);
  };

  const handleRetry = async (message: ChatMessage) => {
    if (!message.query || !onQuery) return;
    
    setMessages(prev => prev.map(m => 
      m.id === message.id ? { ...m, isStreaming: true, content: '', error: undefined } : m
    ));
    setIsLoading(true);

    try {
      const response = await onQuery(message.query);
      const completeMessage: ChatMessage = {
        ...message,
        content: generateResponseText(response),
        response,
        isStreaming: false,
      };
      setMessages(prev => prev.map(m => m.id === message.id ? completeMessage : m));
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { 
          ...m, 
          content: `Error: ${error instanceof Error ? error.message : 'Failed to execute query'}`,
          error: 'execution',
          isStreaming: false 
        } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MetricMind</h1>
              <p className="text-xs text-gray-500">Conversational BI with Semantic Governance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Mock Mode
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {showExamples && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ask a business question</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Try asking about revenue, profit, margins, or shipping costs by market and category for specific time periods.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            index={index}
            onInspect={handleInspect}
            onRetry={handleRetry}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question (e.g., 'Show EU revenue and profit for Q4 2014 by category')"
              rows={1}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </form>

      {/* Inspection Modal */}
      {activeInspection && (
        <InspectionPanel
          data={activeInspection}
          onClose={() => setActiveInspection(null)}
        />
      )}
    </div>
  );
}

function generateResponseText(response: QueryResponse): string {
  if (response.status === 'no_data') {
    return 'No data found for the specified query.';
  }
  
  const { rows, query, metric_definitions, warnings } = response;
  if (rows.length === 0) return 'No results returned.';

  const summaryLines: string[] = [];
  
  if (query.dimensions.length > 0) {
    summaryLines.push(`Results grouped by ${query.dimensions.join(', ')}:`);
  } else {
    summaryLines.push('Aggregate results:');
  }

  rows.slice(0, 5).forEach(row => {
    const dimParts = query.dimensions.map(d => row[d]).filter(Boolean);
    const metricParts = query.metrics.map(m => {
      const formatter = getMetricFormatter(m);
      return `${getMetricLabel(m)}: ${formatter(row[m])}`;
    });
    summaryLines.push(`  ${dimParts.join(' / ') || 'Total'}: ${metricParts.join(', ')}`);
  });

  if (rows.length > 5) {
    summaryLines.push(`  ... and ${rows.length - 5} more groups`);
  }

  if (warnings.length > 0) {
    summaryLines.push('');
    summaryLines.push('⚠️ ' + warnings.join('; '));
  }

  return summaryLines.join('\n');
}

function getMetricFormatter(metric: string) {
  switch (metric) {
    case 'revenue':
    case 'reported_profit':
    case 'shipping_cost':
      return (v: string | null) => v ? `$${parseFloat(v).toLocaleString()}` : '—';
    case 'reported_profit_margin':
      return (v: string | null) => v ? `${parseFloat(v).toFixed(1)}%` : '—';
    default:
      return (v: string | null) => v || '—';
  }
}

function getMetricLabel(metric: string): string {
  switch (metric) {
    case 'revenue': return 'Revenue';
    case 'reported_profit': return 'Profit';
    case 'reported_profit_margin': return 'Margin';
    case 'shipping_cost': return 'Shipping';
    default: return metric;
  }
}

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  onInspect: (data: InspectionData) => void;
  onRetry: (message: ChatMessage) => void;
}

function MessageBubble({ message, onInspect, onRetry }: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInspection, setShowInspection] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-blue-600 px-4 py-3 text-white">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs text-blue-100 mt-1 text-right">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  }

  const hasError = !!message.error;
  const hasResponse = !!message.response;
  const hasQuery = !!message.query;

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
        <Database className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'rounded-2xl bg-white border p-4',
          hasError && 'border-red-200 bg-red-50',
          message.isStreaming && 'animate-pulse-soft'
        )}>
          {message.plan?.status === 'needs_clarification' && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Clarification needed</p>
                <p className="text-sm text-yellow-700 mt-1">{message.content}</p>
              </div>
            </div>
          )}

          {message.plan?.status === 'unsupported' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Question not supported</p>
                <p className="text-sm text-red-700 mt-1">{message.content}</p>
              </div>
            </div>
          )}

          {!message.plan || message.plan.status === 'ready' ? (
            <>
              <div className={cn('whitespace-pre-wrap text-gray-900', message.isStreaming && 'text-gray-500')}>
                {message.content || (message.isStreaming ? 'Generating response...' : '')}
              </div>

              {hasResponse && message.response && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <ChevronDown className={cn('w-4 h-4 transition-transform', showDetails && 'rotate-180')} />
                      <span>{showDetails ? 'Hide' : 'Show'} details</span>
                    </button>
                    {hasQuery && (
                      <button
                        onClick={() => setShowInspection(!showInspection)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Code className="w-4 h-4" />
                        <span>Inspect</span>
                      </button>
                    )}
                  </div>

                  {showDetails && message.response && (
                    <ResponseDetails
                      response={message.response}
                      query={message.query}
                      onInspect={onInspect}
                    />
                  )}

                  {showInspection && message.query && message.response && (
                    <InspectionTrigger
                      query={message.query}
                      response={message.response}
                      onInspect={onInspect}
                    />
                  )}
                </div>
              )}

              {hasError && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => onRetry(message)}
                    disabled={message.isStreaming}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <Loader2 className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}
            </>
          ) : null}

          <p className="text-xs text-gray-400 mt-3 text-right">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ResponseDetailsProps {
  response: QueryResponse;
  query?: QueryRequest;
  onInspect: (data: InspectionData) => void;
}

function ResponseDetails({ response, query, onInspect }: ResponseDetailsProps) {
  const { rows, query: respQuery, metric_definitions, warnings, total_groups, truncated } = response;
  const displayQuery = query || respQuery;

  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Query Parameters</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Metrics</dt>
              <dd className="font-mono text-gray-900">{displayQuery.metrics.join(', ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Dimensions</dt>
              <dd className="font-mono text-gray-900">{displayQuery.dimensions.join(', ') || 'None'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Date Range</dt>
              <dd className="font-mono text-gray-900">{displayQuery.start_date} to {displayQuery.end_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Market Filter</dt>
              <dd className="font-mono text-gray-900">{displayQuery.market || 'All markets'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Row Limit</dt>
              <dd className="font-mono text-gray-900">{displayQuery.limit}</dd>
            </div>
          </dl>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Result Summary</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className={cn('font-mono', response.status === 'ok' ? 'text-green-600' : 'text-yellow-600')}>
                {response.status}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Groups Returned</dt>
              <dd className="font-mono text-gray-900">{total_groups}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Truncated</dt>
              <dd className={cn('font-mono', truncated ? 'text-yellow-600' : 'text-green-600')}>
                {truncated ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Request ID</dt>
              <dd className="font-mono text-gray-900">{response.request_id.slice(0, 8)}...</dd>
            </div>
          </dl>
        </div>
      </div>

      {metric_definitions && Object.keys(metric_definitions).length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Metric Definitions</h4>
          <dl className="space-y-2 text-sm">
            {Object.entries(metric_definitions).map(([metric, definition]) => (
              <div key={metric} className="flex flex-col gap-1">
                <dt className="font-medium text-gray-900">{getMetricLabel(metric)}</dt>
                <dd className="text-gray-600 font-mono text-xs bg-white p-2 rounded border">{definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Warnings
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-1">
                <span>•</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface InspectionTriggerProps {
  query: QueryRequest;
  response: QueryResponse;
  onInspect: (data: InspectionData) => void;
}

function InspectionTrigger({ query, response, onInspect }: InspectionTriggerProps) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <button
        onClick={() => onInspect({
          apiCall: query,
          metricDefinitions: response.metric_definitions,
          warnings: response.warnings,
        })}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        <Code className="w-4 h-4" />
        <span>View API Call & Metric Definitions</span>
      </button>
    </div>
  );
}