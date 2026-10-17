import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatCurrency(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercent(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `${num.toFixed(1)}%`;
}

export function getMetricFormatter(metric: string) {
  switch (metric) {
    case 'revenue':
    case 'reported_profit':
    case 'shipping_cost':
      return formatCurrency;
    case 'reported_profit_margin':
      return formatPercent;
    default:
      return formatNumber;
  }
}

export function getMetricLabel(metric: string): string {
  switch (metric) {
    case 'revenue':
      return 'Revenue';
    case 'reported_profit':
      return 'Profit';
    case 'reported_profit_margin':
      return 'Profit Margin';
    case 'shipping_cost':
      return 'Shipping Cost';
    default:
      return metric;
  }
}

export function getMetricColor(metric: string): string {
  switch (metric) {
    case 'revenue':
      return 'blue';
    case 'reported_profit':
      return 'green';
    case 'reported_profit_margin':
      return 'purple';
    case 'shipping_cost':
      return 'orange';
    default:
      return 'gray';
  }
}