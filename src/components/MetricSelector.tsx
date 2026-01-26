import { Button } from '@/components/ui/button';
import { MetricType } from '@/types';
import { METRICS, AVAILABLE_METRICS } from '@/data/metrics';
import { Brain, Vote, Skull } from 'lucide-react';

interface MetricSelectorProps {
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
}

const METRIC_ICONS: Record<MetricType, React.ComponentType<{ className?: string }>> = {
  overdose_rate: Skull,
  suicide_rate: Skull,
  mental_health_days: Brain,
  vote_share_rep: Vote,
};

export function MetricSelector({ selectedMetric, onMetricChange }: MetricSelectorProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-2 sm:p-4 shadow-sm">
      <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Select Metric</h3>
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_METRICS.map((metricId) => {
          const metric = METRICS[metricId];
          const Icon = METRIC_ICONS[metricId];
          const isSelected = selectedMetric === metricId;

          return (
            <Button
              key={metricId}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMetricChange(metricId)}
              className="justify-start gap-1 sm:gap-2 h-auto py-1.5 sm:py-2 px-2 sm:px-3"
            >
              <Icon className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-[10px] sm:text-xs leading-tight text-left">
                {metric.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
