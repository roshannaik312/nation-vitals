import { useState, useMemo, useCallback } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnnualData, SelectedCounty } from '@/types';
import { fuzzySearch } from '@/lib/fuzzySearch';

interface CountySearchProps {
  data: AnnualData | null;
  year: number;
  onSelectCounty: (county: SelectedCounty) => void;
}

export function CountySearch({ data, year, onSelectCounty }: CountySearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const counties = useMemo(() => {
    if (!data || !data[year.toString()]) return [];
    return Object.entries(data[year.toString()]).map(([fips, countyData]) => ({
      fips,
      name: countyData.county,
      state: countyData.state,
      data: countyData,
    }));
  }, [data, year]);

  const filteredCounties = useMemo(() => {
    if (!query.trim()) return [];
    return fuzzySearch(
      counties,
      query,
      (c) => `${c.name}, ${c.state}`,
      20
    );
  }, [counties, query]);

  const handleSelect = useCallback((county: typeof counties[0]) => {
    onSelectCounty({ fips: county.fips, data: county.data });
    setQuery('');
    setIsOpen(false);
  }, [onSelectCounty]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search counties..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-9 bg-card"
        />
      </div>
      
      {isOpen && filteredCounties.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <ScrollArea className="max-h-64">
            {filteredCounties.map((county) => (
              <button
                key={county.fips}
                onClick={() => handleSelect(county)}
                className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2 transition-colors"
              >
                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">{county.name}</span>
                <span className="text-xs text-muted-foreground">{county.state}</span>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
