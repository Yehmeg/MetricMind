'use client';

import { DashboardLayout } from '@/components/layout';
import { HelpCircle } from 'lucide-react';

const EXAMPLES = [
  'Show Europe revenue and profit for Q3 2026 by category',
  'Show all markets revenue for Q2 2026',
  'Show North America profit for Q2 2026 by category',
  'Show Europe shipping cost for Q3 2026',
];

export default function HelpPage() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Help</h1>
            <p className="text-sm text-muted-foreground">How to ask MetricMind questions</p>
          </div>
        </div>

        <section className="p-4 rounded-xl border border-border bg-card space-y-3">
          <h2 className="text-sm font-medium text-foreground">Question format</h2>
          <p className="text-sm text-muted-foreground">
            Questions are translated into a governed semantic query. Pick a supported market,
            metric and calendar period; optionally group by category or market.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Markets: Europe, North America, or &ldquo;all markets&rdquo;</li>
            <li>Metrics: revenue, profit, profit margin, shipping cost (comma or &ldquo;and&rdquo; separated)</li>
            <li>Periods: a calendar quarter with year (e.g. Q2 2026 or Q3 2026) or a full year</li>
            <li>Optional breakdown: &ldquo;by category&rdquo; or &ldquo;by market&rdquo;</li>
          </ul>
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200 text-sm">
            The governed warehouse (Q2/Q3 2026, Europe and North America) is not connected yet.
            Today the backend answers from a synthetic mock dataset and its offline planner may
            return &ldquo;not supported&rdquo; for region names until its grammar is updated.
          </div>
        </section>

        <section className="p-4 rounded-xl border border-border bg-card space-y-3">
          <h2 className="text-sm font-medium text-foreground">Worked examples</h2>
          <ul className="space-y-2">
            {EXAMPLES.map(question => (
              <li key={question} className="text-sm font-mono text-foreground bg-muted/50 border border-border/50 rounded-lg p-2">
                {question}
              </li>
            ))}
          </ul>
        </section>

        <section className="p-4 rounded-xl border border-border bg-card space-y-2">
          <h2 className="text-sm font-medium text-foreground">Query governance</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Up to 4 metrics and 2 dimensions per query</li>
            <li>Query windows are limited to 366 days</li>
            <li>Row results are capped at 1000 with explicit truncation</li>
            <li>Every answer exposes its query so you can audit how it was produced</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
