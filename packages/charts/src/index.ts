export interface ChartSeriesPoint {
  date: string;
  value: number;
}

export interface KLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// 这里后续封装 ECharts / Lightweight Charts 的通用配置。
export function createEmptyChartOption(title: string) {
  return {
    title: { text: title },
    tooltip: {},
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value' },
    series: [],
  };
}
