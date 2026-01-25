import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Year } from '@/types';
import { YEARS } from '@/data/metrics';

interface YearSliderProps {
  selectedYear: Year;
  onYearChange: (year: Year) => void;
}

export function YearSlider({ selectedYear, onYearChange }: YearSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const yearIndex = YEARS.indexOf(selectedYear);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const currentIndex = YEARS.indexOf(selectedYear);
        const nextIndex = (currentIndex + 1) % YEARS.length;
        onYearChange(YEARS[nextIndex] as Year);
      }, 1500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, onYearChange]);

  const handleSliderChange = (value: number[]) => {
    const year = YEARS[value[0]] as Year;
    onYearChange(year);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          className="shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Year</span>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {selectedYear}
            </span>
          </div>

          <Slider
            value={[yearIndex]}
            min={0}
            max={YEARS.length - 1}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            {YEARS.map((year) => (
              <span
                key={year}
                className={year === selectedYear ? 'text-primary font-medium' : ''}
              >
                {year}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
