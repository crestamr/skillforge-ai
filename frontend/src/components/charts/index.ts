// SkillForge AI - Data Visualization Components
// Comprehensive chart library for career development analytics

export { default as SkillRadarChart } from './SkillRadarChart';
export { default as JobMarketTrendsChart } from './JobMarketTrendsChart';
export { default as SalaryBenchmarkChart } from './SalaryBenchmarkChart';
export { default as LearningProgressChart } from './LearningProgressChart';
export { default as SkillGapAnalysisChart } from './SkillGapAnalysisChart';

// Type exports for component props
export type { SkillData } from './SkillRadarChart';
export type { TrendData } from './JobMarketTrendsChart';
export type { SalaryData } from './SalaryBenchmarkChart';
export type { LearningMilestone } from './LearningProgressChart';
export type { SkillGap } from './SkillGapAnalysisChart';

// Chart configuration constants
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#06b6d4',
  muted: '#64748b'
} as const;

export const CHART_THEMES = {
  light: {
    background: '#ffffff',
    text: '#1e293b',
    grid: '#f1f5f9',
    border: '#e2e8f0'
  },
  dark: {
    background: '#0f172a',
    text: '#f8fafc',
    grid: '#334155',
    border: '#475569'
  }
} as const;

// Common chart utilities
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDuration = (weeks: number): string => {
  if (weeks < 4) return `${weeks}w`;
  if (weeks < 52) return `${Math.round(weeks / 4)}m`;
  return `${Math.round(weeks / 52)}y`;
};

// Chart responsive breakpoints
export const CHART_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440
} as const;

// Default chart dimensions
export const DEFAULT_CHART_DIMENSIONS = {
  small: { width: 400, height: 300 },
  medium: { width: 600, height: 400 },
  large: { width: 800, height: 500 },
  xlarge: { width: 1000, height: 600 }
} as const;
