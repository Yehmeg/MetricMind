'use client';

import { useRef, useEffect, useCallback, useState, useReducer } from 'react';
import { cn } from '@/lib/utils';
import { ConversationInput } from './ConversationInput';
import { MessageBubble } from './MessageBubble';
import { ConversationEmpty, ConversationLoading, SkeletonMessage } from './ConversationStates';
import { InspectionPanel } from './InspectionPanel';
import type { ConversationMessage } from '@/lib/conversation';
import type { QueryRequest, QueryResponse, PlanResponse } from '@/types/api';
import { api, createQueryRequest } from '@/lib/api';
import { conversationReducer, initialConversationState, ConversationAction } from '@/lib/conversation';

interface ConversationAreaProps {
  initialMessages?: ConversationMessage[];
}

export function ConversationArea({ initialMessages = [] }: ConversationAreaProps) {
  const [state, dispatch] = useReducer(conversationReducer, {
    ...initialConversationState,
    messages: initialMessages,
  });
  const [inspectionMessage, setInspectionMessage] = useState<ConversationMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  const handleSubmit = async (question: string) => {
    // Add user message
    dispatch({ type: 'ADD_USER_MESSAGE', payload: { content: question } });
    dispatch({ type: 'SET_PROCESSING', payload: true });

    // Reserve the assistant message id up front so later updates cannot miss
    // due to stale state (state.messages is a snapshot from the current render).
    const assistantId = crypto.randomUUID();

    try {
      // Step 1: Plan the query
      const plan = await api.plan(question);

      if (plan.status === 'needs_clarification') {
        dispatch({
          type: 'ADD_ASSISTANT_MESSAGE',
          payload: {
            id: assistantId,
            content: '',
            timestamp: new Date(),
            status: 'complete',
            plan,
          },
        });
        dispatch({ type: 'SET_PROCESSING', payload: false });
        return;
      }

      if (plan.status === 'unsupported') {
        dispatch({
          type: 'ADD_ASSISTANT_MESSAGE',
          payload: {
            id: assistantId,
            content: '',
            timestamp: new Date(),
            status: 'error',
            plan,
            error: plan.message,
          },
        });
        dispatch({ type: 'SET_PROCESSING', payload: false });
        return;
      }

      // Step 2: Execute the query
      if (plan.query) {
        // Add assistant message with streaming state
        dispatch({
          type: 'ADD_ASSISTANT_MESSAGE',
          payload: {
            id: assistantId,
            content: '',
            timestamp: new Date(),
            status: 'streaming',
            plan,
            query: plan.query,
          },
        });

        try {
          const response = await api.query(plan.query);

          // Generate AI explanation from the response
          const explanation = generateExplanation(response, plan.query);

          // Update message with complete response
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              id: assistantId,
              updates: {
                content: explanation,
                status: 'complete',
                response,
              },
            },
          });
        } catch (error) {
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              id: assistantId,
              updates: {
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to execute query',
              },
            },
          });
        }
      }
    } catch (error) {
      dispatch({
        type: 'ADD_ASSISTANT_MESSAGE',
        payload: {
          content: '',
          timestamp: new Date(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to plan query',
        },
      });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const handleRetry = (messageId: string) => {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || !message.query) return;

    dispatch({ type: 'RETRY_MESSAGE', payload: { id: messageId } });
    dispatch({ type: 'SET_PROCESSING', payload: true });

    api.query(message.query!)
      .then(response => {
        const explanation = generateExplanation(response, message.query!);
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: messageId,
            updates: {
              content: explanation,
              status: 'complete',
              response,
              error: undefined,
            },
          },
        });
      })
      .catch(error => {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: messageId,
            updates: {
              status: 'error',
              error: error instanceof Error ? error.message : 'Failed to execute query',
            },
          },
        });
      })
      .finally(() => {
        dispatch({ type: 'SET_PROCESSING', payload: false });
      });
  };

  const handleInspect = (message: ConversationMessage) => {
    setInspectionMessage(message);
  };

  const handleExampleClick = (question: string) => {
    handleSubmit(question);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Messages area - the primary scroll container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-6">
          {state.messages.length === 0 && !state.isProcessing && (
            <ConversationEmpty onExampleClick={handleExampleClick} />
          )}
        {state.messages.length > 0 && (
          <>
            {state.messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRetry={handleRetry}
                onInspect={handleInspect}
              />
            ))}

            {state.isProcessing && (
              <>
                <SkeletonMessage />
                <SkeletonMessage />
              </>
            )}
          </>
        )}

          <div ref={messagesEndRef} className="shrink-0" />
        </div>
      </div>

      {/* Input area */}
      <ConversationInput
        onSubmit={handleSubmit}
        disabled={state.isProcessing}
        suggestions={state.messages.length === 0 ? EXAMPLE_QUESTIONS : []}
      />

      {/* Inspection Modal */}
      {inspectionMessage && (
        <InspectionPanel
          message={inspectionMessage}
          onClose={() => setInspectionMessage(null)}
        />
      )}
    </div>
  );
}

function generateExplanation(response: QueryResponse, query: QueryRequest): string {
  if (response.status === 'no_data') {
    return 'No data found for the specified query. Try adjusting your date range, market filter, or dimensions.';
  }

  const { rows, metric_definitions, warnings, total_groups } = response;
  if (rows.length === 0) return 'No results returned.';

  const lines: string[] = [];

  // Summary
  const metricLabels = query.metrics.map(m => {
    switch (m) {
      case 'revenue': return 'Revenue';
      case 'reported_profit': return 'Profit';
      case 'reported_profit_margin': return 'Profit Margin';
      case 'shipping_cost': return 'Shipping Cost';
      default: return m;
    }
  });

  if (query.dimensions.length > 0) {
    lines.push(`Results grouped by **${query.dimensions.join(', ')}** across **${total_groups}** group${total_groups !== 1 ? 's' : ''}:`);
  } else {
    lines.push('**Aggregate results:**');
  }

  // Show first few rows
  rows.slice(0, 5).forEach(row => {
    const dimParts = query.dimensions.map(d => row[d]).filter(Boolean);
    const metricParts = query.metrics.map(m => {
      const value = row[m];
      if (value === null || value === undefined) return `${getMetricLabel(m)}: —`;
      const num = parseFloat(value);
      if (isNaN(num)) return `${getMetricLabel(m)}: ${value}`;
      if (m === 'reported_profit_margin') return `${getMetricLabel(m)}: ${num.toFixed(1)}%`;
      if (['revenue', 'reported_profit', 'shipping_cost'].includes(m)) {
        return `${getMetricLabel(m)}: ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      }
      return `${getMetricLabel(m)}: ${num.toLocaleString()}`;
    });
    lines.push(`• **${dimParts.join(' / ') || 'Total'}**: ${metricParts.join(', ')}`);
  });

  if (rows.length > 5) {
    lines.push(`• *... and ${rows.length - 5} more groups*`);
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('⚠️ **Warnings:**');
    warnings.forEach(w => lines.push(`• ${w}`));
  }

  return lines.join('\n');
}

function getMetricLabel(metric: string): string {
  switch (metric) {
    case 'revenue': return 'Revenue';
    case 'reported_profit': return 'Profit';
    case 'reported_profit_margin':
    case 'margin_pct': return 'Profit Margin';
    case 'gross_profit': return 'Gross Profit';
    case 'shipping_cost': return 'Shipping Cost';
    default: return metric;
  }
}

const EXAMPLE_QUESTIONS = [
  'Show EU revenue and profit for Q4 2014 by category',
  'Show all markets revenue for 2014',
  'Show US shipping cost for Q4 2014',
  'Show APAC profit for Q3 2014 by category',
];