import { useState, useEffect } from 'react';
import { AnnualData } from '@/types';
import { getData } from '@/lib/dataLoader';

interface UseCountyDataReturn {
  data: AnnualData | null;
  loading: boolean;
  error: string | null;
  countyCount: number;
}

export function useCountyData(): UseCountyDataReturn {
  const [data, setData] = useState<AnnualData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const loadedData = await getData();
        if (mounted) {
          setData(loadedData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const countyCount = data 
    ? Object.keys(data['2023'] || {}).length 
    : 0;

  return { data, loading, error, countyCount };
}
