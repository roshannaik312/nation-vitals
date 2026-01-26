import { SelectedCounty, MetricType } from '@/types';
import { METRICS } from '@/data/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, MapPin } from 'lucide-react';

interface CountyPanelProps {
  county: SelectedCounty | null;
  selectedMetric: MetricType;
  selectedYear: number;
  onClose: () => void;
}

export function CountyPanel({
  county,
  selectedMetric,
  selectedYear,
  onClose,
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

  const getUrbanRuralColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'urban': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'suburban': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'rural': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{data.county}</CardTitle>
              <Badge className={`capitalize ${getUrbanRuralColor(data.urban_rural)}`}>
                {data.urban_rural}
              </Badge>
              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {selectedYear}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{data.state}</p>
            {/* Political Share - Right beside name on top */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Political Share:</span>
              <span 
                className={`text-sm font-semibold ${data.vote_share_rep > 50 ? 'text-red-600' : 'text-blue-600'}`}
              >
                {data.vote_share_rep > 50 ? 'R' : 'D'} +{Math.abs(data.vote_share_rep - 50).toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({data.vote_share_rep.toFixed(0)}%)
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Metric */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p className="text-3xl font-bold text-foreground">
            {selectedMetric === 'overdose_rate' && metricValue === 0 ? (
              <span className="text-sm text-muted-foreground">Below 10, deaths suppressed by CDC WONDER</span>
            ) : (
              metric.format(metricValue)
            )}
          </p>
        </div>

        {/* Quick Stats - All in one line */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Population: </span>
            <span className="font-medium">{data.population.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Income: </span>
            <span className="font-medium">${(data.median_income / 1000).toFixed(0)}k</span>
          </div>
          <div>
            <span className="text-muted-foreground">Poverty: </span>
            <span className="font-medium">{data.poverty_rate.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">College: </span>
            <span className="font-medium">{data.pct_college.toFixed(1)}%</span>
          </div>
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
      </CardContent>
    </Card>
  );
}
