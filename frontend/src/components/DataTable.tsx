'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { getMetricLabel, getMetricFormatter } from '@/lib/utils';
import type { Metric } from '@/types/api';

interface DataTableProps {
  rows: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: string[];
}

export function DataTable({ rows, metrics, dimensions }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
  }, [sortedRows, page]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-400">No data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Data Table</h3>
        <span className="text-sm text-gray-500">
          {rows.length} row{rows.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    col.type === 'metric' && 'cursor-pointer hover:bg-gray-100 select-none'
                  )}
                  onClick={() => col.type === 'metric' && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.type === 'metric' && sortConfig?.key === col.key && (
                      sortConfig.direction === 'asc' ? '↑' : '↓'
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm">
                    {col.type === 'dimension' ? (
                      <span className="font-medium text-gray-900">{row[col.key] || '—'}</span>
                    ) : (
                      <span className={cn(
                        'font-mono tabular-nums',
                        col.metric === 'reported_profit_margin' ? 'text-purple-700' : 'text-gray-900'
                      )}>
                        {getMetricFormatter(col.metric)(row[col.key])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}