import { MetricConfig, MetricType } from '@/types';

export const METRICS: Record<MetricType, MetricConfig> = {
  overdose_rate: {
    id: 'overdose_rate',
    label: 'Drug Overdose Deaths',
    description: 'Age-adjusted rate per 100,000 population',
    unit: 'per 100k',
    colorScale: 'health',
    domain: [0, 60],
    format: (v) => `${v.toFixed(1)} per 100k`,
  },
  suicide_rate: {
    id: 'suicide_rate',
    label: 'Suicide Mortality',
    description: 'Age-adjusted suicide rate per 100,000 population',
    unit: 'per 100k',
    colorScale: 'health',
    domain: [0, 40],
    format: (v) => `${v.toFixed(1)} per 100k`,
  },
  mental_health_days: {
    id: 'mental_health_days',
    label: 'Poor Mental Health Days',
    description: 'Average number of mentally unhealthy days in past 30 days',
    unit: 'days',
    colorScale: 'health',
    domain: [2, 7],
    format: (v) => `${v.toFixed(1)} days`,
  },
  vote_share_rep: {
    id: 'vote_share_rep',
    label: 'Political Lean',
    description: 'Republican vote share in presidential elections',
    unit: '%',
    colorScale: 'political',
    domain: [0, 100],
    format: (v) => {
      if (v > 50) return `R+${(v - 50).toFixed(0)}`;
      if (v < 50) return `D+${(50 - v).toFixed(0)}`;
      return 'Even';
    },
  },
};

export const YEARS: number[] = [2018, 2019, 2020, 2021, 2022, 2023];

export const AVAILABLE_METRICS: MetricType[] = [
  'overdose_rate',
  'suicide_rate', 
];
