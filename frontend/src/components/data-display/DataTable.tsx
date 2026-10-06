'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown, Maximize2, Copy } from 'lucide-react';
import type { Metric } from '@/types/api';
import { getMetricLabel, getMetricFormatter } from '@/lib/utils';

interface DataTableProps {
  rows: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: string[];
  pageSize?: number;
}

export function DataTable({ rows, metrics, dimensions, pageSize = 10 }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const columns = useMemo(() => [
    ...dimensions.map(d => ({ key: d, header: d.charAt(0).toUpperCase() + d.slice(1), type: 'dimension' as const })),
    ...metrics.map(m => ({ key: m, header: getMetricLabel(m), type: 'metric' as const, metric: m })),
  ], [dimensions, metrics]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortConfig]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const copyCellValue = (value: string | null, label: string) => {
    if (value === null || value === undefined) return;
    navigator.clipboard.writeText(value);
    setCopiedCell(label);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mb-2 text-4xl">📋</div>
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Data Table</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Expand table"
            title="Expand table"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className="bg-muted/50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                    col.type === 'metric' && 'cursor-pointer select-none hover:bg-muted',
                    'text-muted-foreground'
                  )}
                  onClick={() => col.type === 'metric' && handleSort(col.key)}
                  scope="col"
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.type === 'metric' && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn('transition-colors', expandedRow === rowIndex && 'bg-accent/50')}
                onClick={() => setExpandedRow(expandedRow === rowIndex ? null : rowIndex)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm">
                    {col.type === 'dimension' ? (
                      <span className="font-medium text-foreground">{row[col.key] || '—'}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          'font-mono tabular-nums flex-1',
                          col.metric === 'reported_profit_margin' ? 'text-purple-600 dark:text-purple-400' : 'text-foreground'
                        )}>
                          {getMetricFormatter(col.metric)(row[col.key])}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            copyCellValue(row[col.key], col.key);
                          }}
                          className={cn(
                            'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100',
                            copiedCell === col.key && 'text-primary'
                          )}
                          aria-label={`Copy ${col.header} value`}
                        >
                          {copiedCell === col.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} • {rows.length} total rows
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { Check } from 'lucide-react';