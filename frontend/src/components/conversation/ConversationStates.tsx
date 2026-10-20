'use client';

import { cn } from '@/lib/utils';
import { Database, Sparkles, Loader2 } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
  'Show EU revenue and profit for Q4 2014 by category',
  'Show all markets revenue for 2014',
  'Show US shipping cost for Q4 2014',
  'Show APAC profit for Q3 2014 by category',
];

interface ConversationEmptyProps {
  onExampleClick: (question: string) => void;
}

export function ConversationEmpty({ onExampleClick }: ConversationEmptyProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-2 py-10 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Database className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h2 className="mb-3 text-3xl font-semibold tracking-tight text-foreground">Start a conversation</h2>
      <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
        Ask questions about your business data in natural language. MetricMind will translate your
        question into a governed semantic query and return visualizations, KPIs, and explanations.
      </p>
      <p className="mt-4 max-w-lg rounded-lg border border-border/50 bg-muted/40 px-4 py-2 text-xs text-muted-foreground/80">
        Note: answers are currently generated from a synthetic demo dataset. The governed
        warehouse is not connected yet and results are not real business data.
      </p>

      <div className="mt-10 w-full">
        <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Try one of these examples
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((question, i) => (
            <button
              key={i}
              onClick={() => onExampleClick(question)}
              className={cn(
                'group relative rounded-xl border p-5 text-left transition-all',
                'bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="flex-1 pt-1 text-[0.95rem] font-medium leading-snug text-foreground">
                  {question}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border/50 bg-muted/30 px-5 py-4 text-left">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Supported metrics:</span> Revenue, Profit,
            Profit Margin, Shipping Cost
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Supported dimensions:</span> Market, Category
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Date range:</span> a quarter with a year (for
            example, Q4 2014) or a full year (for example, 2014)
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Markets:</span> EU, US, LATAM, Africa, APAC,
            EMEA, Canada — or all markets
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