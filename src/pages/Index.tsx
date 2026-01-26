import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MapView } from '@/components/MapView';
import { YearSlider } from '@/components/YearSlider';
import { MetricSelector } from '@/components/MetricSelector';
import { CountyPanel } from '@/components/CountyPanel';
import { CountySearch } from '@/components/CountySearch';
import { CompareSidebar } from '@/components/CompareSidebar';
import { AnalysisView } from '@/components/AnalysisView';
import { AboutView } from '@/components/AboutView';
import { DataSourcesView } from '@/components/DataSourcesView';
import { StateSummaryTable } from '@/components/StateSummaryTable';
import { FilterControls, defaultFilters, FilterState } from '@/components/FilterControls';
import { useMapData } from '@/hooks/useMapData';
import { useCountyData } from '@/hooks/useCountyData';
import { SelectedCounty } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { GitCompare } from 'lucide-react';

type TabType = 'map' | 'analysis' | 'about' | 'data';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [compareSidebarOpen, setCompareSidebarOpen] = useState(false);
  
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
            <div className="flex flex-col relative">
              {/* Top Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-2 sm:p-4 pb-0 justify-between">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <div className="w-full sm:w-64 flex-shrink-0 relative">
                    <CountySearch 
                      data={data} 
                      year={selectedYear} 
                      onSelectCounty={handleCountySelect}
                    />
                    {/* Hold Constant - Overlay below search */}
                    <div className="absolute top-full left-0 mt-1 z-20 w-full sm:w-auto">
                      <FilterControls filters={filters} onFiltersChange={setFilters} />
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <MetricSelector
                      selectedMetric={selectedMetric}
                      onMetricChange={setSelectedMetric}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] max-w-md">
                    <YearSlider
                      selectedYear={selectedYear}
                      onYearChange={setSelectedYear}
                    />
                  </div>
                </div>
                {/* Compare Button - Top Right */}
                <Button 
                  onClick={() => setCompareSidebarOpen(true)}
                  variant="default"
                  className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto shrink-0"
                >
                  <GitCompare className="w-4 h-4" />
                  <span className="hidden sm:inline">Compare </span>
                  ({compareCounties.length}/5)
                </Button>
              </div>

              {/* Maps Container - 1:2 height:width ratio (height is half of width) */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 sm:p-4" style={{ aspectRatio: '2/1', maxHeight: 'calc(100vh - 20rem)' }}>
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
            
            {/* County Panel Below Map */}
            <div className="border-t border-border p-2 sm:p-4 bg-card/50">
              <div className="flex gap-2 sm:gap-4">
                {/* County Details */}
                <div className="flex-1 min-w-0">
                  <CountyPanel
                    county={hoveredCounty || selectedCounty}
                    selectedMetric={selectedMetric}
                    selectedYear={selectedYear}
                    onClose={() => setSelectedCounty(null)}
                  />
                </div>
              </div>
            </div>
            
            {/* State Summary Table */}
            <div className="p-2 sm:p-6 border-t border-border overflow-x-auto">
              <StateSummaryTable 
                selectedState={selectedState}
                onStateSelect={setSelectedState}
              />
            </div>
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

      {/* Compare Sidebar */}
      <CompareSidebar
        open={compareSidebarOpen}
        onOpenChange={setCompareSidebarOpen}
        counties={compareCounties}
        data={data}
        year={selectedYear}
        onRemove={removeFromCompare}
        onClear={clearCompare}
        onAddCounty={addToCompare}
      />
    </div>
  );
}
