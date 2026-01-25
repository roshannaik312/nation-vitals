import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StateData {
  state_fips: string;
  state_name: string | null;
  DrugDeaths: number | null;
  SuicideDeaths: number | null;
  RepublicanMargin: number | null;
  n_counties: number;
}

type SortField = 'state_name' | 'DrugDeaths' | 'SuicideDeaths' | 'political' | 'n_counties';
type SortDirection = 'asc' | 'desc';

// Get severity level (1-10 scale mapped to 4 categories)
function getSeverityLevel(value: number | null, metric: 'drug' | 'suicide'): number {
  if (value === null) return 0;
  
  // Define thresholds based on metric
  const thresholds = metric === 'drug' 
    ? [20, 50, 100] // Drug deaths thresholds
    : [20, 40, 60]; // Suicide thresholds
  
  if (value < thresholds[0]) return 1; // Very Low (green)
  if (value < thresholds[1]) return 2; // Low-Med (yellow)
  if (value < thresholds[2]) return 3; // Medium (orange)
  return 4; // High (red)
}

// Severity indicator component
function SeverityDot({ level }: { level: number }) {
  const colors: Record<number, string> = {
    0: 'bg-muted', // No data
    1: 'bg-green-500',
    2: 'bg-yellow-500',
    3: 'bg-orange-500',
    4: 'bg-red-500',
  };
  
  return (
    <div className={`w-6 h-6 rounded-full ${colors[level] || colors[0]}`} />
  );
}

// Severity scale legend
function SeverityLegend() {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Severity Scale</h4>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500" />
          <span className="text-sm">1-2: Very Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-yellow-500" />
          <span className="text-sm">3-4: Low-Med</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-orange-500" />
          <span className="text-sm">5-6: Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-500" />
          <span className="text-sm">7-10: High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-muted" />
          <span className="text-sm">No Data</span>
        </div>
      </div>
    </div>
  );
}

interface StateSummaryTableProps {
  selectedState: string | null;
  onStateSelect: (stateName: string | null) => void;
}

export function StateSummaryTable({ selectedState, onStateSelect }: StateSummaryTableProps) {
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('DrugDeaths');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetch('/data/state_summary.json')
      .then(res => res.json())
      .then((data: StateData[]) => {
        // Filter out entries without state names and with valid data
        const validStates = data.filter(
          s => s.state_name && s.state_name.length > 0
        );
        setStateData(validStates);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load state summary:', err);
        setLoading(false);
      });
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...stateData].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;
    
    switch (sortField) {
      case 'state_name':
        aVal = a.state_name || '';
        bVal = b.state_name || '';
        break;
      case 'DrugDeaths':
        aVal = a.DrugDeaths ?? -1;
        bVal = b.DrugDeaths ?? -1;
        break;
      case 'SuicideDeaths':
        aVal = a.SuicideDeaths ?? -1;
        bVal = b.SuicideDeaths ?? -1;
        break;
      case 'political':
        aVal = a.RepublicanMargin ?? 0;
        bVal = b.RepublicanMargin ?? 0;
        break;
      case 'n_counties':
        aVal = a.n_counties;
        bVal = b.n_counties;
        break;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const getPoliticalLabel = (margin: number | null): { label: string; color: string } => {
    if (margin === null) return { label: 'N/A', color: 'text-muted-foreground' };
    // Positive margin = Republican, Negative = Democrat
    if (margin > 0) return { label: 'Republican', color: 'text-red-500' };
    return { label: 'Democrat', color: 'text-blue-500' };
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <SeverityLegend />
      
      <div className="border-l-4 border-primary pl-4 mb-4">
        <h3 className="text-lg font-semibold">
          State-Wise Summary: Mortality Rates & 2024 Federal Election Outcomes
        </h3>
        <p className="text-sm text-muted-foreground">
          State names colored by 2024 presidential election winner (federal results)
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('state_name')}
              >
                <div className="flex items-center gap-1">
                  STATE <SortIcon field="state_name" />
                </div>
              </TableHead>
              <TableHead className="text-center">
                DRUG<br/>SEVERITY
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('DrugDeaths')}
              >
                <div className="flex items-center gap-1">
                  DRUG OVERDOSE<br/>RATE
                  <span className="text-xs text-muted-foreground">(PER 100K)</span>
                  <SortIcon field="DrugDeaths" />
                </div>
              </TableHead>
              <TableHead className="text-center">
                SUICIDE<br/>SEVERITY
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('SuicideDeaths')}
              >
                <div className="flex items-center gap-1">
                  SUICIDE<br/>RATE
                  <span className="text-xs text-muted-foreground">(PER 100K)</span>
                  <SortIcon field="SuicideDeaths" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('political')}
              >
                <div className="flex items-center gap-1">
                  2024 FEDERAL<br/>OUTCOME
                  <SortIcon field="political" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort('n_counties')}
              >
                <div className="flex items-center justify-end gap-1">
                  COUNTIES <SortIcon field="n_counties" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((state) => {
              const political = getPoliticalLabel(state.RepublicanMargin);
              const drugSeverity = getSeverityLevel(state.DrugDeaths, 'drug');
              const suicideSeverity = getSeverityLevel(state.SuicideDeaths, 'suicide');
              const isSelected = selectedState === state.state_name;
              
              return (
                <TableRow 
                  key={state.state_fips} 
                  className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : ''}`}
                  onClick={() => onStateSelect(isSelected ? null : state.state_name)}
                >
                  <TableCell className={`font-medium ${political.color} underline decoration-dotted underline-offset-2`}>
                    {state.state_name}
                    {isSelected && <span className="ml-2 text-xs text-muted-foreground">(click to clear)</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <SeverityDot level={drugSeverity} />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {state.DrugDeaths !== null ? state.DrugDeaths.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <SeverityDot level={suicideSeverity} />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {state.SuicideDeaths !== null ? state.SuicideDeaths.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className={political.color}>
                    {political.label}
                  </TableCell>
                  <TableCell className="text-right">
                    {state.n_counties}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}