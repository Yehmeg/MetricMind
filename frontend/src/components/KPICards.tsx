'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent, getMetricLabel, getMetricColor } from '@/lib/utils';
import type { Metric } from '@/types/api';

interface KPICardsProps {
  rows: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: string[];
}

export function KPICards({ rows, metrics, dimensions }: KPICardsProps) {
  if (rows.length === 0) return null;

  const totals = metrics.map(metric => {
    const values = rows
      .map(r => r[metric])
      .filter((v): v is string => v !== null && v !== undefined && v !== '')
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));
    
    if (values.length === 0) return { metric, value: null, label: getMetricLabel(metric) };
    
    let total: number;
    if (metric === 'reported_profit_margin') {
      total = values.reduce((a, b) => a + b, 0) / values.length;
    } else {
      total = values.reduce((a, b) => a + b, 0);
    }
    
    return { metric, value: total, label: getMetricLabel(metric) };
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {totals.map(({ metric, value, label }) => (
        <div
          key={metric}
          className={cn(
            'p-4 rounded-xl border bg-white',
            'hover:shadow-md transition-shadow'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                getMetricColor(metric) === 'blue' && 'bg-blue-500',
                getMetricColor(metric) === 'green' && 'bg-green-500',
                getMetricColor(metric) === 'purple' && 'bg-purple-500',
                getMetricColor(metric) === 'orange' && 'bg-orange-500',
                getMetricColor(metric) === 'gray' && 'bg-gray-500'
              )}
            />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {value === null ? '—' : metric === 'reported_profit_margin' 
              ? `${value.toFixed(1)}%` 
              : metric === 'revenue' || metric === 'reported_profit' || metric === 'shipping_cost'
                ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : value.toLocaleString()}
          </div>
          {dimensions.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Across {rows.length} group{rows.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}