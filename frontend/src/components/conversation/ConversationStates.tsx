'use client';

import { cn } from '@/lib/utils';
import { Database, MessageSquare, Sparkles, BarChart3, HelpCircle, Loader2 } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
  'Show EU revenue and profit for Q4 2014 by category',
  'Show all markets revenue for Q4 2014',
  'Show US profit margin for Q3 2014 by category',
  'Show EU shipping cost for Q4 2014 by category',
];

interface ConversationEmptyProps {
  onExampleClick: (question: string) => void;
}

export function ConversationEmpty({ onExampleClick }: ConversationEmptyProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Database className="h-10 w-10 text-primary" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-foreground">Start a conversation</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        Ask questions about your business data in natural language. MetricMind will translate your
        question into a governed semantic query and return visualizations, KPIs, and explanations.
      </p>

      <div className="w-full max-w-2xl space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Try one of these examples:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((question, i) => (
            <button
              key={i}
              onClick={() => onExampleClick(question)}
              className={cn(
                'relative p-4 text-left text-sm border rounded-xl transition-all',
                'bg-card border-border hover:border-primary/50 hover:bg-primary/5',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="flex-1 text-foreground">{question}</span>
                <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Supported metrics: Revenue, Profit, Profit Margin, Shipping Cost
            <br />
            Supported dimensions: Market, Category
            <br />
            Date format: Q4 2014, 2014, or specific dates
          </p>
        </div>
      </div>
    </div>
  );
}

interface ConversationLoadingProps {
  message?: string;
}

export function ConversationLoading({ message = 'Thinking...' }: ConversationLoadingProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            Translating your question into a governed semantic query...
          </p>
        </div>
        <div className="flex gap-2 animate-pulse">
          <div className="h-2 w-16 rounded-full bg-muted" />
          <div className="h-2 w-12 rounded-full bg-muted" />
          <div className="h-2 w-8 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonMessageProps {
  isUser?: boolean;
}

export function SkeletonMessage({ isUser = false }: SkeletonMessageProps) {
  return (
    <div className={cn('flex gap-3 animate-pulse', isUser && 'justify-end')}>
      {!isUser && (
        <div className="flex h-8 w-8 items-center justify-center flex-shrink-0 rounded-lg bg-muted" />
      )}
      <div className={cn('flex-1 min-w-0', isUser && 'max-w-[75%]')}>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="space-y-3">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-4 w-5/6 bg-muted rounded" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="h-24 bg-muted rounded-lg border border-border" />
              <div className="h-24 bg-muted rounded-lg border border-border" />
            </div>
            <div className="h-48 bg-muted rounded-lg border border-border" />
            <div className="h-32 bg-muted rounded-lg border border-border" />
          </div>
        </div>
      </div>
    </div>
  );
}