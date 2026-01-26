import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from '@/config/mapbox';
import { MetricType, Year, SelectedCounty, AnnualData } from '@/types';
import { METRICS } from '@/data/metrics';
import { MapLegend } from './MapLegend';
import { Loader2 } from 'lucide-react';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface MapViewProps {
  selectedYear: Year;
  selectedMetric: MetricType;
  data: AnnualData | null;
  loading: boolean;
  selectedState?: string | null;
  onCountySelect: (county: SelectedCounty | null) => void;
  onCountyHover: (county: SelectedCounty | null) => void;
  mapId?: string;
}

export function MapView({ 
  selectedYear, 
  selectedMetric, 
  data,
  loading,
  selectedState,
  onCountySelect, 
  onCountyHover,
  mapId = 'main-map'
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layersReady, setLayersReady] = useState(false);

  const getColorForValue = useCallback((value: number, metric: MetricType): string => {
    const config = METRICS[metric];
    const isPolitical = config.colorScale === 'political';
    
    if (isPolitical) {
      // Political: blue (0) -> purple (50) -> red (100)
      if (value <= 40) return `hsl(215, 85%, ${55 + (40 - value) * 0.5}%)`;
      if (value >= 60) return `hsl(0, 75%, ${55 + (value - 60) * 0.5}%)`;
      return `hsl(270, 50%, 55%)`;
    } else {
      // Health: blue (low) -> yellow -> orange -> red (high)
      const [min, max] = config.domain;
      const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
      
      if (normalized <= 0.33) {
        const t = normalized / 0.33;
        return `hsl(${200 - t * 155}, ${80 - t * 15}%, 55%)`;
      } else if (normalized <= 0.66) {
        const t = (normalized - 0.33) / 0.33;
        return `hsl(${45 - t * 30}, ${95 - t * 5}%, 55%)`;
      } else {
        const t = (normalized - 0.66) / 0.34;
        return `hsl(${15 - t * 15}, ${90 - t * 5}%, ${55 - t * 5}%)`;
      }
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
    });

    map.current = mapInstance;

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
      className: 'county-popup',
    });

    mapInstance.on('load', () => {
      console.log('Map load event fired');
      setMapLoaded(true);
      
      // Add county source using Mapbox's built-in county boundaries
      mapInstance.addSource('counties', {
        type: 'vector',
        url: 'mapbox://mapbox.82pkq93d',
      });

      // Add county fill layer
      mapInstance.addLayer({
        id: 'counties-fill',
        type: 'fill',
        source: 'counties',
        'source-layer': 'original',
        paint: {
          'fill-color': '#cccccc',
          'fill-opacity': 0.7,
        },
      });

      // Add county border layer
      mapInstance.addLayer({
        id: 'counties-border',
        type: 'line',
        source: 'counties',
        'source-layer': 'original',
        paint: {
          'line-color': '#ffffff',
          'line-width': 0.5,
          'line-opacity': 0.8,
        },
      });

      // Hover highlight layer
      mapInstance.addLayer({
        id: 'counties-highlight',
        type: 'line',
        source: 'counties',
        'source-layer': 'original',
        paint: {
          'line-color': '#000000',
          'line-width': 2,
        },
        filter: ['==', ['get', 'FIPS'], ''],
      });

      console.log('Layers added, waiting for tiles to render...');

      // Use 'idle' event which fires when the map is fully rendered
      const onIdle = () => {
        if (mapInstance.isSourceLoaded('counties') && mapInstance.areTilesLoaded()) {
          const features = mapInstance.querySourceFeatures('counties', { sourceLayer: 'original' });
          console.log('Tiles loaded, features available:', features.length);
          if (features.length > 0) {
            const sample = features[0].properties;
            console.log('Sample FIPS type:', typeof sample?.FIPS, 'value:', sample?.FIPS);
          }
          console.log('Map idle, layers ready');
          setLayersReady(true);
          mapInstance.off('idle', onIdle);
        }
      };
      
      mapInstance.on('idle', onIdle);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update county colors when data, metric, or year changes
  useEffect(() => {
    if (!map.current || !layersReady || !data) return;

    const updateColors = () => {
      if (!map.current) return;
      
      // Ensure style is loaded and layer exists
      if (!map.current.isStyleLoaded() || !map.current.getLayer('counties-fill')) {
        console.log('Style not ready, scheduling retry...');
        setTimeout(updateColors, 100);
        return;
      }

      const yearData = data[selectedYear.toString()];
      if (!yearData) return;
      
      // Build a match expression for coloring
      // Mapbox tileset uses numeric FIPS
      const colorEntries: (number | string)[] = [];
      
      Object.entries(yearData).forEach(([fips, countyData]) => {
        // Filter by state if selected
        if (selectedState && countyData.state !== selectedState) {
          return;
        }
        
        const value = countyData[selectedMetric];
        if (typeof value === 'number') {
          const color = getColorForValue(value, selectedMetric);
          // Convert padded string FIPS to numeric (e.g., "01001" -> 1001)
          const numericFips = parseInt(fips, 10);
          if (!isNaN(numericFips) && numericFips > 0) {
            colorEntries.push(numericFips, color);
          }
        }
      });
      
      console.log(`Coloring ${colorEntries.length / 2} counties for ${selectedMetric} in ${selectedYear}${selectedState ? ` (${selectedState})` : ''}`);
      
      if (colorEntries.length > 0) {
        // Use to-number to handle potential string FIPS in tileset
        const colorExpression: mapboxgl.Expression = [
          'match',
          ['to-number', ['get', 'FIPS']],
          ...colorEntries,
          '#e0e0e0' // Default color
        ];

        try {
          map.current.setPaintProperty('counties-fill', 'fill-color', colorExpression);
          console.log('Paint property set successfully');
        } catch (e) {
          console.warn('Failed to set paint property:', e);
          setTimeout(updateColors, 100);
        }
      } else {
        // Reset to default color if no entries
        try {
          map.current.setPaintProperty('counties-fill', 'fill-color', '#e0e0e0');
        } catch (e) {
          console.warn('Failed to reset paint property:', e);
        }
      }
    };

    updateColors();
  }, [data, selectedYear, selectedMetric, selectedState, layersReady, getColorForValue]);

  // Set up hover and click events
  useEffect(() => {
    if (!map.current || !layersReady) return;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!e.features?.length || !map.current || !data) return;
      
      const feature = e.features[0];
      const numericFips = feature.properties?.FIPS;
      
      if (!numericFips) return;

      // Convert numeric FIPS to padded string for data lookup
      const fips = String(numericFips).padStart(5, '0');

      map.current.getCanvas().style.cursor = 'pointer';
      map.current.setFilter('counties-highlight', ['==', 'FIPS', numericFips]);

      const yearData = data[selectedYear.toString()];
      const countyData = yearData?.[fips];
      
      if (countyData && popup.current) {
        const metric = METRICS[selectedMetric];
        const value = countyData[selectedMetric];
        const displayValue = (selectedMetric === 'overdose_rate' && value === 0) 
          ? '<span class="text-xs text-muted-foreground">Below 10, deaths suppressed by CDC WONDER</span>'
          : `<span class="font-semibold text-sm text-foreground">${metric.format(value)}</span>`;
        
        popup.current
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3 min-w-[200px] bg-card rounded-lg">
              <h4 class="font-semibold text-foreground text-sm">${countyData.county}</h4>
              <p class="text-xs text-muted-foreground mb-2">${countyData.state}</p>
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-muted-foreground">${metric.label}</span>
                  ${displayValue}
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-muted-foreground">Population</span>
                  <span class="text-xs text-foreground">${countyData.population.toLocaleString()}</span>
                </div>
              </div>
            </div>
          `)
          .addTo(map.current);
        
        onCountyHover({ fips, data: countyData });
      }
    };

    const handleMouseLeave = () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';
      map.current.setFilter('counties-highlight', ['==', 'FIPS', '']);
      popup.current?.remove();
      onCountyHover(null);
    };

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (!e.features?.length || !data) return;
      
      const feature = e.features[0];
      const numericFips = feature.properties?.FIPS;
      
      if (!numericFips) return;

      // Convert numeric FIPS to padded string for data lookup
      const fips = String(numericFips).padStart(5, '0');

      const yearData = data[selectedYear.toString()];
      const countyData = yearData?.[fips];
      if (countyData) {
        onCountySelect({ fips, data: countyData });
      }
    };

    map.current.on('mousemove', 'counties-fill', handleMouseMove);
    map.current.on('mouseleave', 'counties-fill', handleMouseLeave);
    map.current.on('click', 'counties-fill', handleClick);

    return () => {
      if (map.current) {
        map.current.off('mousemove', 'counties-fill', handleMouseMove);
        map.current.off('mouseleave', 'counties-fill', handleMouseLeave);
        map.current.off('click', 'counties-fill', handleClick);
      }
    };
  }, [layersReady, data, selectedYear, selectedMetric, onCountySelect, onCountyHover]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border shadow-sm">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex items-center gap-3 bg-card px-4 py-3 rounded-lg shadow-lg border">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading county data...</span>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <MapLegend metric={selectedMetric} />
      </div>
      
      {/* Year and State indicator */}
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-md">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm text-muted-foreground">Viewing</span>
            <span className="ml-2 text-xl font-bold tabular-nums">{selectedYear}</span>
          </div>
          {selectedState && (
            <div className="border-l border-border pl-3">
              <span className="text-sm font-medium text-primary">{selectedState}</span>
            </div>
          )}
        </div>
        {data && (
          <p className="text-xs text-muted-foreground mt-1">
            {selectedState 
              ? `${Object.values(data[selectedYear.toString()] || {}).filter(c => c.state === selectedState).length} counties in ${selectedState}`
              : `${Object.keys(data[selectedYear.toString()] || {}).length} counties`
            }
          </p>
        )}
      </div>
    </div>
  );
}
