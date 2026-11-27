export const ANALYTICS_REPORT_KEYS = [
  'financial',
  'revenue',
  'expenses',
  'payroll',
  'pipeline',
  'operations',
] as const
export type AnalyticsReportKey = (typeof ANALYTICS_REPORT_KEYS)[number]

export type AnalyticsFormat = 'money' | 'number' | 'percent'
export type AnalyticsTone = 'cold' | 'heat' | 'success' | 'muted'

export interface AnalyticsMetric {
  label: string
  value: number
  format: AnalyticsFormat
  note?: string
  tone?: 'default' | 'positive' | 'warning'
}

export interface AnalyticsChartSeries {
  key: string
  label: string
  tone: AnalyticsTone
  values: number[]
}

export interface AnalyticsChart {
  title: string
  description?: string
  labels: string[]
  series: AnalyticsChartSeries[]
  format: AnalyticsFormat
}

export interface AnalyticsBreakdownItem {
  label: string
  value: number
  count?: number
  note?: string
}

export interface AnalyticsBreakdown {
  title: string
  description?: string
  items: AnalyticsBreakdownItem[]
  format: AnalyticsFormat
}

export interface AnalyticsTable {
  title: string
  columns: string[]
  rows: (string | number)[][]
  align?: ('left' | 'right')[]
}

export interface AnalyticsInsight {
  title: string
  detail: string
  tone: 'positive' | 'attention' | 'neutral'
}

export interface AnalyticsReport {
  key: AnalyticsReportKey
  title: string
  eyebrow: string
  description: string
  icon: string
  hasData: boolean
  metrics: AnalyticsMetric[]
  charts: AnalyticsChart[]
  breakdowns: AnalyticsBreakdown[]
  tables: AnalyticsTable[]
  insights: AnalyticsInsight[]
}

export interface ReportsAnalytics {
  period: {
    months: number
    from: string
    to: string
    label: string
  }
  generatedAt: string
  reports: AnalyticsReport[]
}
