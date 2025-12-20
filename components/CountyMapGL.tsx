'use client'

import { useState, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface CountyData {
  fips: string
  DrugDeaths: number | null
  DrugDeathRate: number | null
  RepublicanMargin: number | null
  Population: number | null
  SuicideDeaths: number | null
  UnemploymentRate: number | null
  PovertyRate: number | null
  MedianIncome: number | null
}

export default function CountyMapGL() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [countyData, setCountyData] = useState<Record<string, CountyData>>({})
  const [metric, setMetric] = useState<'drugDeaths' | 'republicanMargin'>('drugDeaths')
  const [hoveredCounty, setHoveredCounty] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/county_data.json')
      .then(r => r.json())
      .then((data: CountyData[]) => {
        const dataMap: Record<string, CountyData> = {}
        for (let i = 0; i < data.length; i++) {
          const county = data[i]
          if (county.fips && county.fips !== '0') {
            dataMap[county.fips] = county
          }
        }
        setCountyData(dataMap)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: [-98.5, 39.8],
      zoom: 3.5
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || loading || Object.keys(countyData).length === 0) return

    map.current.on('load', () => {
      if (!map.current) return

      // Load county boundaries
      fetch('/data/us_counties.geojson')
        .then(r => r.json())
        .then(geojson => {
          if (!map.current) return

          // Add source
          map.current.addSource('counties', {
            type: 'geojson',
            data: geojson
          })

          // Add fill layer with default color (will be updated dynamically)
          map.current.addLayer({
            id: 'counties-fill',
            type: 'fill',
            source: 'counties',
            paint: {
              'fill-color': '#94a3b8',
              'fill-opacity': 1,
              'fill-antialias': true,
              'fill-outline-color': '#94a3b8'
            }
          })

          map.current.addLayer({
            id: 'counties-outline',
            type: 'line',
            source: 'counties',
            paint: {
              'line-color': '#ffffff',
              'line-width': 0.5,
              'line-opacity': 0.3
            }
          })

          updateMapColors()
        })
    })
  }, [loading, countyData])

  useEffect(() => {
    updateMapColors()
  }, [metric, countyData])

  const getColorForValue = (value: number | null, isPolitic: boolean): string => {
    if (value === null) return '#e5e7eb'

    if (isPolitic) {
      if (value > 40) return '#7f1d1d'
      if (value > 20) return '#dc2626'
      if (value > 0) return '#fca5a5'
      if (value > -20) return '#93c5fd'
      if (value > -40) return '#2563eb'
      return '#1e3a8a'
    } else {
      if (value > 40) return '#7f1d1d'
      if (value > 30) return '#dc2626'
      if (value > 20) return '#f97316'
      if (value > 10) return '#facc15'
      return '#22c55e'
    }
  }

  const updateMapColors = () => {
    if (!map.current || !map.current.getLayer('counties-fill')) return

    const fillExpression: any[] = ['match', ['get', 'GEOID']]

    const entries = Object.entries(countyData)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const fips = entry[0]
      const data = entry[1] as CountyData
      let value
      if (metric === 'drugDeaths') {
        value = data.DrugDeathRate
      } else {
        value = data.RepublicanMargin
      }
      const isPolitical = metric === 'republicanMargin'
      const color = getColorForValue(value, isPolitical)
      fillExpression.push(fips, color)
    }

    fillExpression.push('#e5e7eb')

    map.current.setPaintProperty('counties-fill', 'fill-color', fillExpression)
    map.current.setPaintProperty('counties-fill', 'fill-outline-color', fillExpression)
  }

  useEffect(() => {
    if (!map.current) return

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!map.current) return
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['counties-fill']
      })

      if (features.length > 0) {
        const feature = features[0]
        const fips = feature.properties?.GEOID
        const countyName = feature.properties?.NAME
        const data = countyData[fips]

        if (data) {
          setHoveredCounty({
            name: countyName,
            ...data
          })
          map.current.getCanvas().style.cursor = 'pointer'
        }
      } else {
        setHoveredCounty(null)
        map.current.getCanvas().style.cursor = ''
      }
    }

    const handleMouseLeave = () => {
      setHoveredCounty(null)
      if (map.current) {
        map.current.getCanvas().style.cursor = ''
      }
    }

    map.current.on('mousemove', 'counties-fill', handleMouseMove)
    map.current.on('mouseleave', 'counties-fill', handleMouseLeave)

    return () => {
      if (map.current) {
        map.current.off('mousemove', 'counties-fill', handleMouseMove)
        map.current.off('mouseleave', 'counties-fill', handleMouseLeave)
      }
    }
  }, [countyData])

  if (loading) {
    return <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
      Loading map data...
    </div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <label className="font-semibold">View:</label>
        <button
          onClick={() => setMetric('drugDeaths')}
          className={`px-4 py-2 rounded ${
            metric === 'drugDeaths'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Drug Death Rate
        </button>
        <button
          onClick={() => setMetric('republicanMargin')}
          className={`px-4 py-2 rounded ${
            metric === 'republicanMargin'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Political Lean
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="font-semibold mb-2">
          {metric === 'drugDeaths' ? 'Drug Death Rate (per 100k)' : 'Republican Margin (%)'}
        </h4>
        <div className="flex gap-2 items-center flex-wrap">
          {metric === 'drugDeaths' ? (
            <>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#22c55e'}}></div>
                <span className="text-sm">&lt;10</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#facc15'}}></div>
                <span className="text-sm">10-20</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#f97316'}}></div>
                <span className="text-sm">20-30</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#dc2626'}}></div>
                <span className="text-sm">30-40</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#7f1d1d'}}></div>
                <span className="text-sm">&gt;40</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#1e3a8a'}}></div>
                <span className="text-sm">D+40</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#2563eb'}}></div>
                <span className="text-sm">D+20</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#93c5fd'}}></div>
                <span className="text-sm">D+0</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#fca5a5'}}></div>
                <span className="text-sm">R+0</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#dc2626'}}></div>
                <span className="text-sm">R+20</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-4" style={{backgroundColor: '#7f1d1d'}}></div>
                <span className="text-sm">R+40</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <div ref={mapContainer} className="h-[600px] rounded-lg shadow-lg" />

        {hoveredCounty && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-xl max-w-xs z-10">
            <h3 className="font-bold text-lg mb-2">{hoveredCounty.name} County</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">FIPS:</span>
                <span className="font-semibold">{hoveredCounty.fips}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Drug Deaths:</span>
                <span className="font-semibold">
                  {hoveredCounty.DrugDeaths?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Death Rate:</span>
                <span className="font-semibold">
                  {hoveredCounty.DrugDeathRate?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Political Lean:</span>
                <span className="font-semibold">
                  {hoveredCounty.RepublicanMargin !== null
                    ? `${hoveredCounty.RepublicanMargin > 0 ? 'R+' : 'D+'}${Math.abs(hoveredCounty.RepublicanMargin).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Population:</span>
                <span className="font-semibold">
                  {hoveredCounty.Population ? Math.round(hoveredCounty.Population).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
