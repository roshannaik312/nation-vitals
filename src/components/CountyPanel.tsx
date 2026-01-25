import { SelectedCounty, MetricType } from '@/types';
import { METRICS } from '@/data/metrics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitCompare, X, TrendingUp, TrendingDown, MapPin } from 'lucide-react';

interface CountyPanelProps {
  county: SelectedCounty | null;
  selectedMetric: MetricType;
  selectedYear: number;
  onClose: () => void;
  onAddToCompare: (county: SelectedCounty) => void;
  compareCount: number;
}

export function CountyPanel({
  county,
  selectedMetric,
  selectedYear,
  onClose,
  onAddToCompare,
  compareCount,
}: CountyPanelProps) {
  if (!county) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Click a county on the map to view details</p>
        </div>
      </div>
    );
  }

  const { data } = county;
  const metric = METRICS[selectedMetric];
  const metricValue = data[selectedMetric];

  const stats = [
    { label: 'Population', value: data.population.toLocaleString() },
    { label: 'Median Income', value: `$${(data.median_income / 1000).toFixed(0)}k` },
    { label: 'Poverty Rate', value: `${data.poverty_rate.toFixed(1)}%` },
    { label: 'College Educated', value: `${data.pct_college.toFixed(1)}%` },
  ];

  const demographics = [
    { label: 'White', value: data.pct_white },
    { label: 'Black', value: data.pct_black },
    { label: 'Hispanic', value: data.pct_hispanic },
    { label: 'Asian', value: data.pct_asian },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{data.county}</CardTitle>
            <p className="text-sm text-muted-foreground">{data.state}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="capitalize">
            {data.urban_rural}
          </Badge>
          <Badge variant="outline">{selectedYear}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Metric */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p className="text-3xl font-bold text-foreground">
            {metric.format(metricValue)}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Demographics */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Demographics</p>
          <div className="space-y-1">
            {demographics.map((demo) => (
              <div key={demo.label} className="flex items-center gap-2">
                <div className="w-20 text-xs text-muted-foreground">{demo.label}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/60 rounded-full"
                    style={{ width: `${demo.value}%` }}
                  />
                </div>
                <div className="w-10 text-xs text-right">{demo.value.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Political Lean */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-2">Political Lean</p>
          <div className="flex items-center gap-2">
            <div 
              className="h-3 flex-1 rounded-full overflow-hidden flex"
              style={{ background: 'linear-gradient(to right, hsl(215 85% 55%), hsl(0 75% 50%))' }}
            >
              <div 
                className="h-full bg-transparent"
                style={{ width: `${data.vote_share_dem}%` }}
              />
              <div className="w-0.5 h-full bg-white" />
            </div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-blue-600">D {data.vote_share_dem.toFixed(0)}%</span>
            <span className="text-red-600">R {data.vote_share_rep.toFixed(0)}%</span>
          </div>
        </div>

        {/* Add to Compare Button */}
        <Button 
          onClick={() => onAddToCompare(county)} 
          className="w-full gap-2"
          disabled={compareCount >= 2}
        >
          <GitCompare className="w-4 h-4" />
          {compareCount >= 2 ? 'Compare List Full' : 'Add to Compare'}
        </Button>
      </CardContent>
    </Card>
  );
}
