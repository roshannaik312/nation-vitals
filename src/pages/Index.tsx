import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MapView } from '@/components/MapView';
import { YearSlider } from '@/components/YearSlider';
import { MetricSelector } from '@/components/MetricSelector';
import { CountyPanel } from '@/components/CountyPanel';
import { CountySearch } from '@/components/CountySearch';
import { CompareView } from '@/components/CompareView';
import { AnalysisView } from '@/components/AnalysisView';
import { AboutView } from '@/components/AboutView';
import { DataSourcesView } from '@/components/DataSourcesView';
import { StateSummaryTable } from '@/components/StateSummaryTable';
import { FilterControls, defaultFilters, FilterState } from '@/components/FilterControls';
import { useMapData } from '@/hooks/useMapData';
import { useCountyData } from '@/hooks/useCountyData';
import { SelectedCounty } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

type TabType = 'map' | 'compare' | 'analysis' | 'about' | 'data';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  
  const { data, loading, error } = useCountyData();
  const {
    selectedYear,
    setSelectedYear,
    selectedMetric,
    setSelectedMetric,
    selectedCounty,
    setSelectedCounty,
    hoveredCounty,
    setHoveredCounty,
    compareCounties,
    addToCompare,
    removeFromCompare,
    clearCompare,
  } = useMapData();

  const handleAddToCompare = (county: SelectedCounty) => {
    addToCompare(county);
    // Auto-switch to compare tab when second county is added
    if (compareCounties.length >= 1) {
      setActiveTab('compare');
    }
  };

  const handleCountySelect = (county: SelectedCounty | null) => {
    setSelectedCounty(county);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'map' && (
          <div className="flex flex-col">
            {/* Map Section - Two Maps Side by Side */}
            <div className="h-[calc(100vh-3.5rem-3rem)] flex flex-col">
              {/* Top Controls */}
              <div className="flex flex-wrap items-center gap-4 p-4 pb-0">
                <div className="w-64">
                  <CountySearch 
                    data={data} 
                    year={selectedYear} 
                    onSelectCounty={handleCountySelect}
                  />
                </div>
                <MetricSelector
                  selectedMetric={selectedMetric}
                  onMetricChange={setSelectedMetric}
                />
                <div className="flex-1 min-w-[200px] max-w-md">
                  <YearSlider
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                  />
                </div>
              </div>

              {/* Maps Container */}
              <div className="flex-1 flex gap-4 p-4 min-h-0">
                {/* Health Metric Map */}
                <div className="flex-1 min-w-0">
                  {error ? (
                    <div className="h-full flex items-center justify-center bg-muted/30 rounded-xl border border-border">
                      <div className="text-center p-8">
                        <p className="text-destructive font-medium">Failed to load data</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                      </div>
                    </div>
                  ) : (
                    <MapView
                      selectedYear={selectedYear}
                      selectedMetric={selectedMetric}
                      data={data}
                      loading={loading}
                      selectedState={selectedState}
                      onCountySelect={handleCountySelect}
                      onCountyHover={setHoveredCounty}
                    />
                  )}
                </div>

                {/* Political Lean Map */}
                <div className="flex-1 min-w-0">
                  {error ? (
                    <div className="h-full flex items-center justify-center bg-muted/30 rounded-xl border border-border">
                      <div className="text-center p-8">
                        <p className="text-destructive font-medium">Failed to load data</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                      </div>
                    </div>
                  ) : (
                    <MapView
                      selectedYear={selectedYear}
                      selectedMetric="vote_share_rep"
                      data={data}
                      loading={loading}
                      selectedState={selectedState}
                      onCountySelect={handleCountySelect}
                      onCountyHover={setHoveredCounty}
                      mapId="political-map"
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* County Panel and Filters Below Map */}
            <div className="border-t border-border p-4 bg-card/50">
              <div className="flex gap-4 flex-wrap">
                {/* Filters */}
                <div className="w-64">
                  <FilterControls filters={filters} onFiltersChange={setFilters} />
                </div>
                
                {/* County Details */}
                <div className="flex-1 min-w-[300px]">
                  <CountyPanel
                    county={selectedCounty}
                    selectedMetric={selectedMetric}
                    selectedYear={selectedYear}
                    onClose={() => setSelectedCounty(null)}
                    onAddToCompare={handleAddToCompare}
                    compareCount={compareCounties.length}
                  />
                </div>
                
                {/* Compare Queue */}
                {compareCounties.length > 0 && (
                  <div className="w-64 bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Compare Queue ({compareCounties.length}/2)
                    </p>
                    <div className="space-y-1">
                      {compareCounties.map((c) => (
                        <div 
                          key={c.fips} 
                          className="flex items-center justify-between text-sm bg-background rounded px-2 py-1"
                        >
                          <span>{c.data.county}, {c.data.state}</span>
                          <button 
                            onClick={() => removeFromCompare(c.fips)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* State Summary Table */}
            <div className="p-6 border-t border-border">
              <StateSummaryTable 
                selectedState={selectedState}
                onStateSelect={setSelectedState}
              />
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="container max-w-7xl mx-auto py-6 px-4">
            <CompareView
              counties={compareCounties}
              data={data}
              onRemove={removeFromCompare}
              onClear={clearCompare}
            />
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="container max-w-7xl mx-auto py-6 px-4">
            <AnalysisView />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="container max-w-7xl mx-auto py-6 px-4">
            <AboutView />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="container max-w-7xl mx-auto py-6 px-4">
            <DataSourcesView />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
