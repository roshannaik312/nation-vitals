import { useState, useMemo, useCallback } from 'react';
import { X, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectedCounty, AnnualData, Year } from '@/types';
import { METRICS, YEARS } from '@/data/metrics';
import { fuzzySearch } from '@/lib/fuzzySearch';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface CompareSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counties: SelectedCounty[];
  data: AnnualData | null;
  year: number;
  onRemove: (fips: string) => void;
  onClear: () => void;
  onAddCounty: (county: SelectedCounty) => void;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(40, 70%, 50%)',
];

export function CompareSidebar({
  open,
  onOpenChange,
  counties,
  data,
  year,
  onRemove,
  onClear,
  onAddCounty,
}: CompareSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const availableCounties = useMemo(() => {
    if (!data || !data[year.toString()]) return [];
    return Object.entries(data[year.toString()]).map(([fips, countyData]) => ({
      fips,
      name: countyData.county,
      state: countyData.state,
      data: countyData,
    }));
  }, [data, year]);

  const filteredCounties = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return fuzzySearch(
      availableCounties.filter(c => !counties.some(selected => selected.fips === c.fips)),
      searchQuery,
      (c) => `${c.name}, ${c.state}`,
      10
    );
  }, [availableCounties, searchQuery, counties]);

  const handleSelectCounty = useCallback((county: typeof availableCounties[0]) => {
    if (counties.length >= 5) return;
    onAddCounty({ fips: county.fips, data: county.data });
    setSearchQuery('');
    setSearchOpen(false);
  }, [counties.length, onAddCounty]);

  // Build time series data for each county
  const timeSeriesData = useMemo(() => {
    if (!data || counties.length === 0) return [];
    
    return YEARS.map((year) => {
      const yearData = data[year.toString()];
      const point: Record<string, number | string> = { year };
      
      counties.forEach((county, idx) => {
        const countyData = yearData?.[county.fips];
        if (countyData) {
          point[`overdose_${idx}`] = countyData.overdose_rate || 0;
          point[`mental_health_${idx}`] = countyData.mental_health_days || 0;
          point[`political_${idx}`] = countyData.vote_share_rep || 0;
        }
      });
      
      return point;
    });
  }, [data, counties]);

  // Demographics comparison data
  const demographicsData = useMemo(() => {
    return [
      {
        category: 'White',
        ...Object.fromEntries(counties.map((c, i) => [`county_${i}`, c.data.pct_white])),
      },
      {
        category: 'Black',
        ...Object.fromEntries(counties.map((c, i) => [`county_${i}`, c.data.pct_black])),
      },
      {
        category: 'Hispanic',
        ...Object.fromEntries(counties.map((c, i) => [`county_${i}`, c.data.pct_hispanic])),
      },
      {
        category: 'Asian',
        ...Object.fromEntries(counties.map((c, i) => [`county_${i}`, c.data.pct_asian])),
      },
    ];
  }, [counties]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compare Counties</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search counties... (${counties.length}/5)`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                className="pl-9 bg-card"
                disabled={counties.length >= 5}
              />
            </div>
            
            {searchOpen && filteredCounties.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <ScrollArea className="max-h-64">
                  {filteredCounties.map((county) => (
                    <button
                      key={county.fips}
                      onClick={() => handleSelectCounty(county)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2 transition-colors"
                    >
                      <span className="text-sm font-medium">{county.name}</span>
                      <span className="text-xs text-muted-foreground">{county.state}</span>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Selected Counties */}
          {counties.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {counties.length} {counties.length === 1 ? 'county' : 'counties'} selected
                </p>
                <Button variant="outline" size="sm" onClick={onClear}>
                  Clear All
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {counties.map((county, idx) => (
                  <Badge 
                    key={county.fips} 
                    variant="secondary"
                    className="text-sm py-1 px-3 gap-2"
                    style={{ borderLeftColor: CHART_COLORS[idx], borderLeftWidth: 3 }}
                  >
                    {county.data.county}, {county.data.state}
                    <button onClick={() => onRemove(county.fips)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4">
                {counties.map((county, idx) => (
                  <Card key={county.fips} style={{ borderTopColor: CHART_COLORS[idx], borderTopWidth: 3 }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{county.data.county}</span>
                        <Badge variant="outline" className="capitalize">{county.data.urban_rural}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{county.data.state}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Population</p>
                          <p className="text-lg font-semibold">{county.data.population.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Median Income</p>
                          <p className="text-lg font-semibold">${(county.data.median_income / 1000).toFixed(0)}k</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Overdose Rate</p>
                          <p className="text-lg font-semibold">
                            {county.data.overdose_rate === 0 ? (
                              <span className="text-xs text-muted-foreground">Below 10, deaths suppressed by CDC WONDER</span>
                            ) : (
                              county.data.overdose_rate.toFixed(1)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Political Share</p>
                          <p className="text-lg font-semibold" style={{ color: county.data.vote_share_rep > 50 ? '#dc2626' : '#2563eb' }}>
                            {county.data.vote_share_rep > 50 ? 'R' : 'D'} +{Math.abs(county.data.vote_share_rep - 50).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Trend Charts */}
              <div className="space-y-6">
                {/* Overdose Rate Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Drug Overdose Rate Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          {counties.map((county, idx) => (
                            <Line
                              key={county.fips}
                              type="monotone"
                              dataKey={`overdose_${idx}`}
                              name={county.data.county}
                              stroke={CHART_COLORS[idx]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Political Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Political Share Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          {counties.map((county, idx) => (
                            <Line
                              key={county.fips}
                              type="monotone"
                              dataKey={`political_${idx}`}
                              name={county.data.county}
                              stroke={CHART_COLORS[idx]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Demographics Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Demographics Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demographicsData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={60} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => `${value.toFixed(1)}%`}
                          />
                          <Legend />
                          {counties.map((county, idx) => (
                            <Bar
                              key={county.fips}
                              dataKey={`county_${idx}`}
                              name={county.data.county}
                              fill={CHART_COLORS[idx]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Metric</th>
                          {counties.map((county, idx) => (
                            <th key={county.fips} className="text-right py-2 font-medium" style={{ color: CHART_COLORS[idx] }}>
                              {county.data.county}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2 text-muted-foreground">Overdose Rate (per 100k)</td>
                          {counties.map((c) => (
                            <td key={c.fips} className="text-right py-2 font-medium">
                              {c.data.overdose_rate === 0 ? (
                                <span className="text-xs text-muted-foreground">Below 10, deaths suppressed by CDC WONDER</span>
                              ) : (
                                c.data.overdose_rate.toFixed(1)
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Poverty Rate (%)</td>
                          {counties.map((c) => (
                            <td key={c.fips} className="text-right py-2 font-medium">{c.data.poverty_rate.toFixed(1)}%</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Median Income</td>
                          {counties.map((c) => (
                            <td key={c.fips} className="text-right py-2 font-medium">${(c.data.median_income / 1000).toFixed(0)}k</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">College Educated (%)</td>
                          {counties.map((c) => (
                            <td key={c.fips} className="text-right py-2 font-medium">{c.data.pct_college.toFixed(1)}%</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Political Share</td>
                          {counties.map((c) => (
                            <td key={c.fips} className="text-right py-2 font-medium">{c.data.vote_share_rep.toFixed(1)}%</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {counties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Counties Selected</h2>
              <p className="text-muted-foreground max-w-md">
                Search and add up to 5 counties to compare health outcomes, demographics, and political trends side by side.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
