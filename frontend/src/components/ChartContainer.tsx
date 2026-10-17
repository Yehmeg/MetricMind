'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DatasetComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { cn } from '@/lib/utils';
import { getMetricLabel, getMetricColor } from '@/lib/utils';
import type { Metric } from '@/types/api';

echarts.use([BarChart, LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, DatasetComponent, CanvasRenderer]);

interface ChartContainerProps {
  rows: Record<string, string | null>[];
  metrics: Metric[];
  dimensions: string[];
}

export function ChartContainer({ rows, metrics, dimensions }: ChartContainerProps) {
  const [chartType, setChartType] = useState<'auto' | 'bar' | 'line' | 'pie'>('auto');
  const chartRef = useRef<ReactECharts>(null);

  const chartConfig = useMemo(() => {
    if (rows.length === 0 || metrics.length === 0) return null;

    const hasTimeDimension = dimensions.some(d => d.includes('date') || d.includes('month') || d.includes('quarter') || d.includes('year'));
    const isComparison = dimensions.length > 0 && !hasTimeDimension;
    const isTimeSeries = hasTimeDimension && dimensions.length === 1;

    const effectiveType = chartType === 'auto' 
      ? (isTimeSeries ? 'line' : isComparison ? 'bar' : metrics.length === 1 && dimensions.length === 1 ? 'pie' : 'bar')
      : chartType;

    const xKey = dimensions[0] || 'group';
    const series = metrics.map((metric, i) => ({
      name: getMetricLabel(metric),
      type: effectiveType === 'pie' ? 'pie' : effectiveType,
      data: rows.map(row => ({
        name: row[xKey] || `Group ${rows.indexOf(row) + 1}`,
        value: row[metric] ? parseFloat(row[metric]) : 0,
      })),
      itemStyle: {
        color: getChartColor(metric, i),
      },
    }));

    if (effectiveType === 'pie' && metrics.length > 1) {
      return {
        title: { text: 'Distribution', left: 'center' },
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
        textStyle: { fontSize: 14, fontWeight: 500, color: '#374151' }
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
      grid: { left: '3%', right: '4%', bottom: '15%', top: '35%', containLabel: true },
      xAxis: {
        type: 'category',
        data: rows.map((row, i) => row[xKey] || `Group ${i + 1}`),
        axisLabel: { interval: 0, rotate: dimensions.length > 0 ? 30 : 0, fontSize: 11 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { 
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1e6) return `${(value/1e6).toFixed(1)}M`;
            if (value >= 1e3) return `${(value/1e3).toFixed(1)}K`;
            return value.toString();
          }
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

  const getChartColor = (metric: Metric, index: number) => {
    const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#06b6d4'];
    return colors[index % colors.length];
  };

  if (!chartConfig) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-400">No data to visualize</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Visualization</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Chart type:</span>
          <select
            value={chartType}
            onChange={e => setChartType(e.target.value as typeof chartType)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auto">Auto</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
        </div>
      </div>
      <div style={{ height: 350 }}>
        <ReactECharts
          ref={chartRef}
          option={chartConfig}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}