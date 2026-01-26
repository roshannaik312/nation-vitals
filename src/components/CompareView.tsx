import { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectedCounty, AnnualData, Year } from '@/types';
import { METRICS, YEARS } from '@/data/metrics';
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

interface CompareViewProps {
  counties: SelectedCounty[];
  data: AnnualData | null;
  onRemove: (fips: string) => void;
  onClear: () => void;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(220, 70%, 50%)'];

export function CompareView({ counties, data, onRemove, onClear }: CompareViewProps) {
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
          point[`suicide_${idx}`] = countyData.suicide_rate || 0;
          point[`mental_health_${idx}`] = countyData.mental_health_days || 0;
          point[`rep_share_${idx}`] = countyData.vote_share_rep || 0;
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

  // Socioeconomic comparison
  const socioeconomicData = useMemo(() => {
    return [
      {
        category: 'Poverty Rate (%)',
        ...Object.fromEntries(counties.map((c, i) => [`county_${i}`, c.data.poverty_rate])),
      },
      {
        category: 'College Educated (%)',
        ...Object.fromEntries(counties.map((c, i) => [`county_${i}`, c.data.pct_college])),
      },
    ];
  }, [counties]);

  if (counties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Counties Selected</h2>
        <p className="text-muted-foreground max-w-md">
          Click on counties in the Map view and select "Add to Compare" to compare 
          health outcomes, demographics, and political trends side by side.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with selected counties */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">County Comparison</h2>
          <div className="flex gap-2">
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
        </div>
        {counties.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear All
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <p className="text-lg font-semibold">{county.data.overdose_rate.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Political Lean</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Suicide Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suicide Rate Trend</CardTitle>
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
                      dataKey={`suicide_${idx}`}
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
                      dataKey={`rep_share_${idx}`}
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
                  {counties.length === 2 && (
                    <th className="text-right py-2 font-medium">Difference</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 text-muted-foreground">Overdose Rate (per 100k)</td>
                  {counties.map((c) => (
                    <td key={c.fips} className="text-right py-2 font-medium">{c.data.overdose_rate.toFixed(1)}</td>
                  ))}
                  {counties.length === 2 && (
                    <td className="text-right py-2">
                      <DiffBadge value={counties[0].data.overdose_rate - counties[1].data.overdose_rate} />
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">Suicide Rate (per 100k)</td>
                  {counties.map((c) => (
                    <td key={c.fips} className="text-right py-2 font-medium">{c.data.suicide_rate.toFixed(1)}</td>
                  ))}
                  {counties.length === 2 && (
                    <td className="text-right py-2">
                      <DiffBadge value={counties[0].data.suicide_rate - counties[1].data.suicide_rate} />
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">Poverty Rate (%)</td>
                  {counties.map((c) => (
                    <td key={c.fips} className="text-right py-2 font-medium">{c.data.poverty_rate.toFixed(1)}%</td>
                  ))}
                  {counties.length === 2 && (
                    <td className="text-right py-2">
                      <DiffBadge value={counties[0].data.poverty_rate - counties[1].data.poverty_rate} suffix="%" />
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">Median Income</td>
                  {counties.map((c) => (
                    <td key={c.fips} className="text-right py-2 font-medium">${(c.data.median_income / 1000).toFixed(0)}k</td>
                  ))}
                  {counties.length === 2 && (
                    <td className="text-right py-2">
                      <DiffBadge value={(counties[0].data.median_income - counties[1].data.median_income) / 1000} prefix="$" suffix="k" />
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">College Educated (%)</td>
                  {counties.map((c) => (
                    <td key={c.fips} className="text-right py-2 font-medium">{c.data.pct_college.toFixed(1)}%</td>
                  ))}
                  {counties.length === 2 && (
                    <td className="text-right py-2">
                      <DiffBadge value={counties[0].data.pct_college - counties[1].data.pct_college} suffix="%" />
                    </td>
                  )}
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">Political Share</td>
                  {counties.map((c) => (
                    <td key={c.fips} className="text-right py-2 font-medium">{c.data.vote_share_rep.toFixed(1)}%</td>
                  ))}
                  {counties.length === 2 && (
                    <td className="text-right py-2">
                      <DiffBadge value={counties[0].data.vote_share_rep - counties[1].data.vote_share_rep} suffix="%" />
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DiffBadge({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const isPositive = value > 0;
  const isZero = Math.abs(value) < 0.1;
  
  if (isZero) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="w-3 h-3" />
        0
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1 ${isPositive ? 'text-amber-600' : 'text-emerald-600'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{prefix}{value.toFixed(1)}{suffix}
    </span>
  );
}
