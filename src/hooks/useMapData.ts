import { useState, useCallback } from 'react';
import { MetricType, Year, CountyData, SelectedCounty, AnnualData } from '@/types';

interface UseMapDataReturn {
  selectedYear: Year;
  setSelectedYear: (year: Year) => void;
  selectedMetric: MetricType;
  setSelectedMetric: (metric: MetricType) => void;
  selectedCounty: SelectedCounty | null;
  setSelectedCounty: (county: SelectedCounty | null) => void;
  hoveredCounty: SelectedCounty | null;
  setHoveredCounty: (county: SelectedCounty | null) => void;
  getCountyData: (fips: string, data: AnnualData | null) => CountyData | null;
  compareCounties: SelectedCounty[];
  addToCompare: (county: SelectedCounty) => void;
  removeFromCompare: (fips: string) => void;
  clearCompare: () => void;
}

export function useMapData(): UseMapDataReturn {
  const [selectedYear, setSelectedYear] = useState<Year>(2023);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('overdose_rate');
  const [selectedCounty, setSelectedCounty] = useState<SelectedCounty | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<SelectedCounty | null>(null);
  const [compareCounties, setCompareCounties] = useState<SelectedCounty[]>([]);

  const getCountyData = useCallback((fips: string, data: AnnualData | null): CountyData | null => {
    if (!data) return null;
    const yearData = data[selectedYear.toString()];
    return yearData?.[fips] || null;
  }, [selectedYear]);

  const addToCompare = useCallback((county: SelectedCounty) => {
    setCompareCounties(prev => {
      if (prev.length >= 5) {
        return [prev[1], prev[2], prev[3], prev[4], county];
      }
      if (prev.some(c => c.fips === county.fips)) {
        return prev;
      }
      return [...prev, county];
    });
  }, []);

  const removeFromCompare = useCallback((fips: string) => {
    setCompareCounties(prev => prev.filter(c => c.fips !== fips));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareCounties([]);
  }, []);

  return {
    selectedYear,
    setSelectedYear,
    selectedMetric,
    setSelectedMetric,
    selectedCounty,
    setSelectedCounty,
    hoveredCounty,
    setHoveredCounty,
    getCountyData,
    compareCounties,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
}
