// NationVitals type definitions

export type MetricType = 
  | 'overdose_rate'
  | 'suicide_rate'
  | 'mental_health_days'
  | 'vote_share_rep';

export type Year = 2018 | 2019 | 2020 | 2021 | 2022 | 2023;

export interface CountyData {
  fips: string;
  county: string;
  state: string;
  overdose_rate: number;
  suicide_rate: number;
  mental_health_days: number;
  poverty_rate: number;
  median_income: number;
  pct_white: number;
  pct_black: number;
  pct_hispanic: number;
  pct_asian: number;
  vote_share_rep: number;
  vote_share_dem: number;
  violent_crime: number;
  urban_rural: 'urban' | 'suburban' | 'rural';
  population: number;
  pct_college: number;
}

export interface AnnualData {
  [year: string]: {
    [fips: string]: CountyData;
  };
}

export interface MetricConfig {
  id: MetricType;
  label: string;
  description: string;
  unit: string;
  colorScale: 'health' | 'political';
  domain: [number, number];
  format: (value: number) => string;
}

export interface CountyFeature {
  type: 'Feature';
  properties: {
    GEOID: string;
    NAME: string;
    STATE: string;
    [key: string]: any;
  };
  geometry: GeoJSON.Geometry;
}

export interface SelectedCounty {
  fips: string;
  data: CountyData;
}
