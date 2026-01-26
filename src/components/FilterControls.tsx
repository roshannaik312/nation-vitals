import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

export interface FilterState {
  adjustForPoverty: boolean;
  adjustForIncome: boolean;
  adjustForEducation: boolean;
  adjustForRace: boolean;
  adjustForUrbanRural: boolean;
  adjustForCrime: boolean;
}

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterControls({ filters, onFiltersChange }: FilterControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleToggle = (key: keyof FilterState) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  const filterOptions = [
    { key: 'adjustForPoverty' as const, label: 'Poverty Rate' },
    { key: 'adjustForIncome' as const, label: 'Median Income' },
    { key: 'adjustForEducation' as const, label: 'Educational Attainment' },
    { key: 'adjustForRace' as const, label: 'Race/Ethnicity' },
    { key: 'adjustForUrbanRural' as const, label: 'Urban vs Rural' },
    { key: 'adjustForCrime' as const, label: 'Violent Crime Rate' },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto justify-between bg-card/95 backdrop-blur-sm shadow-md">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Hold Constant</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {activeCount}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-card/95 backdrop-blur-sm rounded-lg space-y-3 shadow-lg border border-border">
          <p className="text-xs text-muted-foreground">
            Adjust visualizations to control for confounding variables:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filterOptions.map((option) => (
              <div key={option.key} className="flex items-center space-x-2">
                <Checkbox
                  id={option.key}
                  checked={filters[option.key]}
                  onCheckedChange={() => handleToggle(option.key)}
                />
                <Label 
                  htmlFor={option.key} 
                  className="text-xs cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {activeCount > 0 && (
            <Badge variant="outline" className="text-xs">
              Showing adjusted values
            </Badge>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const defaultFilters: FilterState = {
  adjustForPoverty: false,
  adjustForIncome: false,
  adjustForEducation: false,
  adjustForRace: false,
  adjustForUrbanRural: false,
  adjustForCrime: false,
};
