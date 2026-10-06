'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { cn } from '@/lib/utils';
import type { Metric } from '@/types/api';

echarts.use([BarChart, LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, DatasetComponent, CanvasRenderer]);

interface ChartContainerProps {
  rows: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: string[];
  height?: number;
}

export function ChartContainer({ rows, metrics, dimensions, height = 350 }: ChartContainerProps) {
  const [chartType, setChartType] = useState<'auto' | 'bar' | 'line' | 'pie'>('auto');
  const chartRef = useRef<ReactECharts>(null);

  const chartOption = useMemo(() => {
    if (rows.length === 0 || metrics.length === 0) return null;

    const hasTimeDimension = dimensions.some(d =>
      d.includes('date') || d.includes('month') || d.includes('quarter') || d.includes('year')
    );
    const isComparison = dimensions.length > 0 && !hasTimeDimension;
    const isTimeSeries = hasTimeDimension && dimensions.length === 1;

    const effectiveType = chartType === 'auto'
      ? (isTimeSeries ? 'line' : isComparison ? 'bar' : metrics.length === 1 && dimensions.length === 1 ? 'pie' : 'bar')
      : chartType;

    const xKey = dimensions[0] || 'group';
    const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

    const series = metrics.map((metric, i) => ({
      name: getMetricLabel(metric),
      type: effectiveType === 'pie' ? 'pie' : effectiveType,
      data: rows.map(row => ({
        name: row[xKey] || `Group ${rows.indexOf(row) + 1}`,
        value: row[metric] ? parseFloat(row[metric]) : 0,
      })),
      itemStyle: { color: colors[i % colors.length] },
    }));

    if (effectiveType === 'pie') {
      return {
        title: { text: metrics.map(getMetricLabel).join(' / '), left: 'center', textStyle: { fontSize: 14, fontWeight: 500 } },
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', left: 'left', data: metrics.map(getMetricLabel) },
        series: metrics.map((metric, i) => ({
          name: getMetricLabel(metric),
          type: 'pie' as const,
          radius: ['40%', '70%'],
          center: ['50%', '60%'],
          data: rows.map(row => ({
            name: row[xKey] || `Group ${rows.indexOf(row) + 1}`,
            value: row[metric] ? parseFloat(row[metric]) : 0,
          })),
          itemStyle: { borderRadius: 4 },
        })),
      };
    }

    return {
      title: {
        text: metrics.map(getMetricLabel).join(' / '),
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 500 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            return params.map(p => `${p.seriesName}: ${formatValue(p.value, p.seriesName)}`).join('<br/>');
          }
          return `${params.seriesName}: ${formatValue(params.value, params.seriesName)}`;
        },
      },
      legend: {
        data: metrics.map(getMetricLabel),
        bottom: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: rows.map((row, i) => row[xKey] || `Group ${i + 1}`),
        axisLabel: { interval: 0, rotate: dimensions.length > 0 ? 30 : 0, fontSize: 11 },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'var(--border)' } },
        axisLabel: {
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
            if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
            if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
            return value.toString();
          },
        },
      },
      series,
    };
  }, [rows, metrics, dimensions, chartType]);

  const formatValue = (value: number, seriesName: string) => {
    const isPercent = seriesName.toLowerCase().includes('margin');
    const isCurrency = seriesName.toLowerCase().includes('revenue') ||
      seriesName.toLowerCase().includes('profit') ||
      seriesName.toLowerCase().includes('shipping');

    if (isPercent) return `${value.toFixed(1)}%`;
    if (isCurrency) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return value.toLocaleString();
  };

  function getMetricLabel(metric: string): string {
    switch (metric) {
      case 'revenue': return 'Revenue';
      case 'reported_profit': return 'Profit';
      case 'reported_profit_margin': return 'Profit Margin';
      case 'shipping_cost': return 'Shipping Cost';
      default: return metric;
    }
  }

  if (!chartOption) {
    return (
      <div className={cn('rounded-xl border border-border bg-card flex items-center justify-center', `h-[${height}px]`)}>
        <div className="text-center text-muted-foreground">
          <div className="mb-2 text-4xl">📊</div>
          <p>No data to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Visualization</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Chart type:</span>
          <select
            value={chartType}
            onChange={e => setChartType(e.target.value as typeof chartType)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Chart type"
          >
            <option value="auto">Auto</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
        </div>
      </div>
      <div style={{ height }} className="p-4">
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          style={{ width: '100%', height: '100%' }}
          onEvents={{
            click: (params: any) => {
              console.log('Chart click:', params);
            },
          }}
        />
      </div>
    </div>
  );
}