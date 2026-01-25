import { MetricType } from '@/types';
import { METRICS } from '@/data/metrics';

interface MapLegendProps {
  metric: MetricType;
}

export function MapLegend({ metric }: MapLegendProps) {
  const config = METRICS[metric];
  const isPolitical = config.colorScale === 'political';

  const healthGradient = 'linear-gradient(to right, hsl(200 80% 55%), hsl(45 95% 55%), hsl(15 90% 55%), hsl(0 85% 50%))';
  const politicalGradient = 'linear-gradient(to right, hsl(215 85% 55%), hsl(270 50% 55%), hsl(0 75% 50%))';

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-md">
      <h4 className="text-xs font-medium text-foreground mb-2">
        {config.label}
      </h4>
      
      <div 
        className="h-3 rounded-full mb-1"
        style={{ background: isPolitical ? politicalGradient : healthGradient }}
      />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        {isPolitical ? (
          <>
            <span>D+50</span>
            <span>Even</span>
            <span>R+50</span>
          </>
        ) : (
          <>
            <span>{config.domain[0]}</span>
            <span>{config.domain[1]} {config.unit}</span>
          </>
        )}
      </div>
    </div>
  );
}
