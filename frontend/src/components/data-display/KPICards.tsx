'use client';

import { cn } from '@/lib/utils';
import type { Metric } from '@/types/api';

const METRIC_COLORS: Record<Metric, string> = {
  revenue: 'blue',
  reported_profit: 'green',
  reported_profit_margin: 'purple',
  shipping_cost: 'orange',
};

const METRIC_ICONS: Record<Metric, React.ReactNode> = {
  revenue: <DollarSign className="h-5 w-5" />,
  reported_profit: <TrendingUp className="h-5 w-5" />,
  reported_profit_margin: <Percent className="h-5 w-5" />,
  shipping_cost: <Truck className="h-5 w-5" />,
};

interface KPICardsProps {
  rows: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: string[];
}

function DollarSign({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function Percent({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function Truck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 16 11" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Key Performance Indicators">
      {totals.map(({ metric, value, label }) => (
        <KPICard
          key={metric}
          metric={metric}
          label={label}
          value={value}
          color={METRIC_COLORS[metric]}
          icon={METRIC_ICONS[metric]}
          groupCount={rows.length}
        />
      ))}
    </div>
  );
}

interface KPICardProps {
  metric: Metric;
  label: string;
  value: number | null;
  color: string;
  icon: React.ReactNode;
  groupCount: number;
}

function KPICard({ metric, label, value, color, icon, groupCount }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  };

  return (
    <article className={cn(
      'rounded-xl border p-5 transition-all hover:shadow-lg',
      'bg-card border-border',
      colorClasses[color as keyof typeof colorClasses] || 'bg-muted text-muted-foreground border-border'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClasses[color as keyof typeof colorClasses] || 'bg-muted')}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">Across {groupCount} group{groupCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={cn('text-3xl font-bold tabular-nums', colorClasses[color as keyof typeof colorClasses] || 'text-foreground')}>
          {value === null ? (
            <span className="text-muted-foreground">—</span>
          ) : metric === 'reported_profit_margin' ? (
            `${value.toFixed(1)}%`
          ) : ['revenue', 'reported_profit', 'shipping_cost'].includes(metric) ? (
            `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          ) : (
            value.toLocaleString()
          )}
        </div>
      </div>
    </article>
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