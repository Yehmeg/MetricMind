'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { api } from '@/lib/api';
import type { MetricsCatalogResponse } from '@/types/api';
import { Database } from 'lucide-react';

export default function ExplorerPage() {
  const [catalog, setCatalog] = useState<MetricsCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .metrics()
      .then(res => {
        if (!cancelled) setCatalog(res);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load metrics catalog');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Data Explorer</h1>
            <p className="text-sm text-muted-foreground">Governed metric catalog and query limits</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {!catalog && !error && (
          <p className="text-sm text-muted-foreground">Loading catalog...</p>
        )}

        {catalog && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-medium text-foreground">Metrics</h2>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(catalog.metrics).map(([name, definition]) => (
                  <div key={name} className="p-4 grid gap-1 sm:grid-cols-3">
                    <span className="font-medium text-foreground capitalize">{name.replace(/_/g, ' ')}</span>
                    <span className="sm:col-span-2 text-sm font-mono text-muted-foreground">{definition}</span>
                  </div>
                ))}
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-xl border border-border bg-card">
                <dt className="text-xs text-muted-foreground mb-1">Available dimensions</dt>
                <dd className="text-sm font-mono text-foreground">{catalog.dimensions.join(', ')}</dd>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <dt className="text-xs text-muted-foreground mb-1">Max query window</dt>
                <dd className="text-sm font-mono text-foreground">{catalog.max_window_days} days</dd>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <dt className="text-xs text-muted-foreground mb-1">Max rows returned</dt>
                <dd className="text-sm font-mono text-foreground">{catalog.max_rows}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
