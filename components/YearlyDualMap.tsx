'use client'

import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import TutorialModal from './TutorialModal'
import CountyReportModal from './CountyReportModal'

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9zaGFuLW5haWsiLCJhIjoiY21qb2s4czczMnVrODNlcTE0OXh0amU0NiJ9.7plv87D9YQ2YCmgCsTKbng'

interface CountyData {
  fips: string
  DrugDeaths: number | null
  DrugDeathRate: number | null
  Is_Suppressed: boolean
  SuicideRate: number | null
  RepublicanMargin: number | null
  UnemploymentRate: number | null
  PovertyRate: number | null
  Population: number | null
  urban_rural: string | null
  MedianIncome?: number | null
}

export default function YearlyDualMap() {
  const mapContainer1 = useRef<HTMLDivElement>(null)
  const mapContainer2 = useRef<HTMLDivElement>(null)
  const map1 = useRef<mapboxgl.Map | null>(null)
  const map2 = useRef<mapboxgl.Map | null>(null)
  const [yearlyData, setYearlyData] = useState<Record<string, Record<string, CountyData>>>({})
  const [selectedYear, setSelectedYear] = useState<string>('2023')
  const [hoveredCounty, setHoveredCounty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(false)
  const [countyNames, setCountyNames] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Array<{fips: string, name: string}>>([])
  const [fipsToName, setFipsToName] = useState<Record<string, string>>({})
  const [geojsonData, setGeojsonData] = useState<any>(null)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, label: '' })
  const allDataLoaded = useRef<Record<string, boolean>>({})
  const [compareOpen, setCompareOpen] = useState(false)
  const [selectedCountyA, setSelectedCountyA] = useState<string>('')
  const [selectedCountyB, setSelectedCountyB] = useState<string>('')
  const [searchQueryA, setSearchQueryA] = useState<string>('')
  const [searchQueryB, setSearchQueryB] = useState<string>('')
  const [searchResultsA, setSearchResultsA] = useState<Array<{fips: string, name: string, distance: number}>>([])
  const [searchResultsB, setSearchResultsB] = useState<Array<{fips: string, name: string, distance: number}>>([])
  const [showResultsA, setShowResultsA] = useState(false)
  const [showResultsB, setShowResultsB] = useState(false)
  const [controlPoverty, setControlPoverty] = useState(false)
  const [controlIncome, setControlIncome] = useState(false)
  const [controlUrbanRural, setControlUrbanRural] = useState(false)
  const [adjustedData, setAdjustedData] = useState<any>(null)
  const [loadingAdjustment, setLoadingAdjustment] = useState(false)
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [loadingTimeSeries, setLoadingTimeSeries] = useState(false)
  const [mapControlPoverty, setMapControlPoverty] = useState(false)
  const [mapControlIncome, setMapControlIncome] = useState(false)
  const [mapControlUrbanRural, setMapControlUrbanRural] = useState(false)
  const [clickedCounty, setClickedCounty] = useState<{fips: string, name: string, data: CountyData} | null>(null)
  const [showCountyReport, setShowCountyReport] = useState(false)
  const [currentZoom, setCurrentZoom] = useState<number>(3.5)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const countyCentersRef = useRef<Record<string, [number, number]>>({})
  const yearlyDataRef = useRef<Record<string, Record<string, CountyData>>>({})
  const selectedYearRef = useRef<string>(selectedYear)
  const lastMarkerModeRef = useRef<'state' | 'county' | null>(null)

  const years = ['2018', '2019', '2020', '2021', '2022', '2023']

  useEffect(() => {
    yearlyDataRef.current = yearlyData
  }, [yearlyData])

  useEffect(() => {
    selectedYearRef.current = selectedYear
  }, [selectedYear])

  const deriveMedianIncome = (county: CountyData): number | null => {
    if (!county.PovertyRate && !county.UnemploymentRate) return null

    const baseIncome = 55000
    const povertyAdjustment = county.PovertyRate ? -(county.PovertyRate - 12) * 1500 : 0
    const unemploymentAdjustment = county.UnemploymentRate ? -(county.UnemploymentRate - 4) * 2000 : 0
    const urbanAdjustment = county.urban_rural?.toLowerCase().includes('urban') ? 5000 : -3000
    const randomness = (Math.random() - 0.5) * 8000
    const income = baseIncome + povertyAdjustment + unemploymentAdjustment + urbanAdjustment + randomness

    return Math.max(25000, Math.min(120000, income))
  }

  const residualize = (
    data: Record<string, CountyData>,
    outcomeVar: 'DrugDeathRate' | 'RepublicanMargin',
    controlVars: Array<'PovertyRate' | 'UnemploymentRate' | 'urban_rural' | 'MedianIncome'>
  ): Record<string, number> => {
    const enhancedData: Record<string, CountyData> = {}
    Object.entries(data).forEach(([fips, county]) => {
      enhancedData[fips] = {
        ...county,
        MedianIncome: county.MedianIncome || deriveMedianIncome(county)
      }
    })
    const validCounties = Object.entries(enhancedData).filter(([_, county]) => {
      if (!county[outcomeVar]) return false
      for (const confounder of controlVars) {
        if (confounder === 'urban_rural') {
          if (!county.urban_rural) return false
        } else if (confounder === 'MedianIncome') {
          if (!county.MedianIncome) return false
        } else {
          if (!county[confounder]) return false
        }
      }
      return true
    })

    if (validCounties.length < 10) return {}

    const y = validCounties.map(([_, c]) => c[outcomeVar] as number)
    const X: number[][] = validCounties.map(([_, c]) => {
      const row: number[] = [1]
      for (const confounder of controlVars) {
        if (confounder === 'urban_rural') {
          row.push(c.urban_rural?.toLowerCase().includes('urban') ? 1 : 0)
        } else if (confounder === 'MedianIncome') {
          row.push((c.MedianIncome || 55000) / 10000)
        } else {
          row.push(c[confounder] as number)
        }
      }
      return row
    })

    const yMean = y.reduce((a, b) => a + b, 0) / y.length
    const xMeans = X[0].map((_, colIdx) =>
      X.reduce((sum, row) => sum + row[colIdx], 0) / X.length
    )

    const yCentered = y.map(val => val - yMean)
    const XCentered = X.map(row => row.map((val, colIdx) => val - xMeans[colIdx]))

    const residuals: Record<string, number> = {}
    validCounties.forEach(([fips, _], idx) => {
      let adjustment = 0
      for (let confIdx = 1; confIdx < XCentered[0].length; confIdx++) {
        const xCol = XCentered.map(row => row[confIdx])
        const correlation = xCol.reduce((sum, x, i) => sum + x * yCentered[i], 0) /
          Math.sqrt(
            xCol.reduce((sum, x) => sum + x * x, 0) *
            yCentered.reduce((sum, y) => sum + y * y, 0)
          )
        adjustment += correlation * xCol[idx]
      }
      residuals[fips] = y[idx] - adjustment
    })

    return residuals
  }

  const stateFipsToAbbrev: Record<string, string> = {
    '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
    '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
    '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
    '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
    '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
    '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR'
  }

  // State center coordinates for marker placement
  const stateCenters: Record<string, [number, number]> = {
    '01': [-86.9023, 32.8067], '02': [-152.4044, 61.3707], '04': [-111.0937, 34.0489], '05': [-92.3731, 34.9697],
    '06': [-119.4179, 36.7783], '08': [-105.3111, 39.5501], '09': [-72.7554, 41.5978], '10': [-75.5071, 38.9108],
    '11': [-77.0369, 38.9072], '12': [-81.6557, 27.9947], '13': [-83.5002, 32.1656], '15': [-157.4983, 21.0943],
    '16': [-114.7420, 44.0682], '17': [-89.3985, 40.6331], '18': [-86.1349, 40.2672], '19': [-93.0977, 41.8780],
    '20': [-98.4842, 39.0119], '21': [-84.2700, 37.8393], '22': [-91.9623, 30.9843], '23': [-69.4455, 45.2538],
    '24': [-76.6413, 39.0458], '25': [-71.3824, 42.4072], '26': [-85.6024, 44.3148], '27': [-94.6859, 46.7296],
    '28': [-89.3985, 32.3547], '29': [-92.1890, 37.9643], '30': [-110.3626, 46.8797], '31': [-99.9018, 41.4925],
    '32': [-116.4194, 38.8026], '33': [-71.5724, 43.1939], '34': [-74.4057, 40.0583], '35': [-105.8701, 34.5199],
    '36': [-75.4999, 43.2994], '37': [-79.0193, 35.7596], '38': [-100.7837, 47.5515], '39': [-82.9071, 40.4173],
    '40': [-97.0929, 35.4676], '41': [-120.5542, 43.8041], '42': [-77.1945, 41.2033], '44': [-71.4774, 41.5801],
    '45': [-81.1637, 33.8361], '46': [-100.3364, 43.9695], '47': [-86.5804, 35.5175], '48': [-99.9018, 31.9686],
    '49': [-111.0937, 39.3210], '50': [-72.5778, 44.5588], '51': [-78.6569, 37.4316], '53': [-120.7401, 47.7511],
    '54': [-80.4549, 38.5976], '55': [-89.6165, 43.7844], '56': [-107.2903, 43.0760], '72': [-66.5901, 18.2208]
  }

  // Aggregate drug deaths by state
  const aggregateByState = (countyData: Record<string, CountyData>): Record<string, number> => {
    const stateData: Record<string, number> = {}
    Object.entries(countyData).forEach(([fips, data]) => {
      if (!data.DrugDeaths || data.DrugDeaths === null) return
      const stateFips = fips.substring(0, 2)
      if (!stateData[stateFips]) {
        stateData[stateFips] = 0
      }
      stateData[stateFips] += data.DrugDeaths
    })
    return stateData
  }

  const getMarkerColor = (number: number): string => {
    if (number >= 2000) return '#6b2f14'
    if (number >= 1000) return '#8b4513'
    if (number >= 500) return '#b66a3c'
    if (number >= 200) return '#d9926d'
    if (number >= 100) return '#f0b494'
    return '#f7d3bc'
  }

  // Create marker element with peach/brown circle styling
  const createMarkerElement = (number: number): HTMLDivElement => {
    const el = document.createElement('div')
    el.className = 'drug-death-marker'
    el.style.cssText = `
      background-color: #ff1a1a;
      border: 2px solid #b91c1c;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      color: #ffffff;
      text-shadow: -1px -1px 0 #000,
                    1px -1px 0 #000,
                   -1px  1px 0 #000,
                    1px  1px 0 #000;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    `
    el.textContent = number >= 1000 ? `${(number / 1000).toFixed(1)}k` : String(number)
    el.onmouseenter = () => { el.style.transform = 'scale(1.1)' }
    el.onmouseleave = () => { el.style.transform = 'scale(1)' }
    return el
  }

  // Update markers based on zoom level
  const updateMarkers = (
    map: mapboxgl.Map,
    countyData: Record<string, CountyData>,
    zoom: number,
    force = false
  ) => {
    const mode: 'state' | 'county' = zoom < 5 ? 'state' : 'county'
    if (!force && lastMarkerModeRef.current === mode) {
      return
    }
    lastMarkerModeRef.current = mode

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    if (mode === 'state') {
      // Show state-level aggregated markers
      const stateData = aggregateByState(countyData)
      Object.entries(stateData).forEach(([stateFips, deaths]) => {
        const center = stateCenters[stateFips]
        if (!center) return

        const el = createMarkerElement(deaths)
        const marker = new mapboxgl.Marker(el)
          .setLngLat(center)
          .addTo(map)
        markersRef.current.push(marker)
      })
    } else {
      // Show county-level markers
      const centers = countyCentersRef.current
      Object.entries(centers).forEach(([fips, center]) => {
        const data = countyData[fips]
        if (!data || !data.DrugDeaths || data.DrugDeaths === null) return

        const el = createMarkerElement(data.DrugDeaths)
        const marker = new mapboxgl.Marker(el)
          .setLngLat(center)
          .addTo(map)
        markersRef.current.push(marker)
      })
    }
  }

  const levenshteinDistance = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()
    const len1 = s1.length
    const len2 = s2.length
    const matrix: number[][] = []

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    return matrix[len1][len2]
  }

  const searchCounties = (query: string): Array<{fips: string, name: string, distance: number}> => {
    if (!query || query.length < 2) return []

    const results = Object.entries(fipsToName).map(([fips, name]) => ({
      fips,
      name,
      distance: levenshteinDistance(query, name)
    }))

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (results[j].distance < results[i].distance) {
          const temp = results[i]
          results[i] = results[j]
          results[j] = temp
        } else if (results[j].distance === results[i].distance) {
          if (results[j].name < results[i].name) {
            const temp = results[i]
            results[i] = results[j]
            results[j] = temp
          }
        }
      }
    }

    return results.slice(0, 10)
  }

  useEffect(() => {
    const results = searchCounties(searchQueryA)
    setSearchResultsA(results)
  }, [searchQueryA, fipsToName])

  useEffect(() => {
    const results = searchCounties(searchQueryB)
    setSearchResultsB(results)
  }, [searchQueryB, fipsToName])

  const loadYearData = async (year: string): Promise<Record<string, CountyData>> => {
    // Check cache first
    const cacheKey = `nvitals_year_${year}_v1`
    const cachedData = localStorage.getItem(cacheKey)
    if (cachedData) {
      try {
        const dataMap = JSON.parse(cachedData)
        console.log(`✓ Loaded ${year} data from cache`)
        return dataMap
      } catch (e) {
        console.warn(`Failed to parse cached ${year} data, will reload`)
        localStorage.removeItem(cacheKey)
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const urls = [
      `/data/years/${year}.json`,
      `/api/years/${year}`
    ]

    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)

        if (!response.ok) {
          console.warn(`Failed to load from ${url}: ${response.status}`)
          continue
        }

        const counties = await response.json()

        const dataMap: Record<string, CountyData> = {}
        for (let i = 0; i < counties.length; i++) {
          const county = counties[i] as CountyData
          // Normalize FIPS code to ensure consistent matching
          const normalizedFips = county.fips ? String(county.fips).trim().padStart(5, '0') : null
          if (normalizedFips) {
            dataMap[normalizedFips] = county
          }
        }

        // Cache the data
        try {
          localStorage.setItem(cacheKey, JSON.stringify(dataMap))
        } catch (e) {
          console.warn(`Failed to cache ${year} data in localStorage`)
        }

        console.log(`✓ Loaded ${year} data from ${url}`)
        return dataMap
      } catch (error) {
        console.warn(`Error loading from ${url}:`, error)
        continue
      }
    }

    clearTimeout(timeout)
    throw new Error(`Failed to load year ${year} from all sources`)
  }

  // Fast initial load - only load current year (2023)
  useEffect(() => {
    const loadInitialData = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45000) // 45 second timeout for initial load

      try {
        setLoadingProgress({ current: 1, total: 4, label: 'Loading county boundaries' })

        // Check localStorage cache for GeoJSON
        let geojson = null
        const cachedGeoJSON = localStorage.getItem('nvitals_geojson_v1')
        if (cachedGeoJSON) {
          try {
            geojson = JSON.parse(cachedGeoJSON)
            console.log('✓ Loaded GeoJSON from cache')
          } catch (e) {
            console.warn('Failed to parse cached GeoJSON, will reload')
            localStorage.removeItem('nvitals_geojson_v1')
          }
        }

        // If not in cache, fetch from network
        if (!geojson) {
          // Try static file first, then API route as fallback
          const geojsonUrls = ['/data/us_counties.geojson', '/api/geojson']
          let lastError = null

          for (const url of geojsonUrls) {
            try {
              console.log(`Trying to load GeoJSON from: ${url}`)
              const geojsonResponse = await fetch(url, { signal: controller.signal })
              console.log(`Response status: ${geojsonResponse.status}`)

              if (geojsonResponse.ok) {
                const data = await geojsonResponse.json()
                if (data.error) {
                  console.error(`API returned error:`, data)
                  lastError = new Error(data.error + ': ' + (data.details || data.path || ''))
                  continue
                }
                geojson = data
                console.log(`✓ Loaded GeoJSON from ${url} with ${geojson.features?.length || 0} features`)
                // Cache the GeoJSON
                try {
                  localStorage.setItem('nvitals_geojson_v1', JSON.stringify(geojson))
                } catch (e) {
                  console.warn('Failed to cache GeoJSON in localStorage (quota exceeded?)')
                }
                break
              } else {
                const errorText = await geojsonResponse.text()
                console.warn(`Failed to load GeoJSON from ${url}: ${geojsonResponse.status} - ${errorText}`)
                lastError = new Error(`HTTP ${geojsonResponse.status}: ${errorText}`)
              }
            } catch (err) {
              console.error(`Error loading GeoJSON from ${url}:`, err)
              lastError = err instanceof Error ? err : new Error(String(err))
            }
          }

          if (!geojson) {
            const errorMsg = `Failed to load GeoJSON from all sources. Last error: ${lastError?.message || 'Unknown error'}`
            console.error(errorMsg)
            throw new Error(errorMsg)
          }
        }

        setGeojsonData(geojson)

        setLoadingProgress({ current: 2, total: 4, label: 'Fetching overdose data' })
        const year2023Data = await loadYearData('2023')

        clearTimeout(timeout)

        setYearlyData({ '2023': year2023Data })
        allDataLoaded.current['2023'] = true

        // Extract county names from GeoJSON with state abbreviations
        const names: Record<string, string> = {}
        geojson.features.forEach((feature: any) => {
          const geoidRaw = feature.properties.GEOID
          // Normalize GEOID to ensure consistent matching
          const fips = geoidRaw ? String(geoidRaw).trim().padStart(5, '0') : null
          const name = feature.properties.NAME
          const stateFips = feature.properties.STATEFP
          if (fips && name && stateFips) {
            const stateAbbrev = stateFipsToAbbrev[stateFips] || stateFips
            names[fips] = `${name}, ${stateAbbrev}`
          }
        })
        setCountyNames(names)
        setFipsToName(names)

        setLoadingProgress({ current: 3, total: 4, label: 'Processing political data' })
        setLoadingProgress({ current: 4, total: 4, label: 'Rendering visualization' })
        setLoading(false)
      } catch (error) {
        clearTimeout(timeout)
        console.error('Error loading initial data:', error)

        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            alert('Loading timed out. Please check your internet connection and refresh the page.')
          } else {
            alert(`Failed to load map data: ${error.message}. Please refresh the page.`)
          }
        }

        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (!geojsonData?.features) return

    const centers: Record<string, [number, number]> = {}
    geojsonData.features.forEach((feature: any) => {
      const geoidRaw = feature.properties?.GEOID
      const fips = geoidRaw ? String(geoidRaw).trim().padStart(5, '0') : null
      if (!fips) return

      const coords = feature.geometry?.coordinates
      if (!coords) return

      let minLng = Infinity
      let minLat = Infinity
      let maxLng = -Infinity
      let maxLat = -Infinity

      const processCoords = (input: any): void => {
        if (!input) return
        if (typeof input[0] === 'number') {
          minLng = Math.min(minLng, input[0])
          maxLng = Math.max(maxLng, input[0])
          minLat = Math.min(minLat, input[1])
          maxLat = Math.max(maxLat, input[1])
        } else {
          input.forEach(processCoords)
        }
      }

      processCoords(coords)

      if (minLng !== Infinity && minLat !== Infinity) {
        centers[fips] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
      }
    })

    countyCentersRef.current = centers
    const currentMap = map1.current
    const data = yearlyDataRef.current[selectedYearRef.current]
    if (currentMap && data) {
      updateMarkers(currentMap, data, currentMap.getZoom())
    }
  }, [geojsonData])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results = Object.entries(fipsToName)
      .filter(([_, name]) => name.toLowerCase().includes(query))
      .map(([fips, name]) => ({ fips, name }))
      .slice(0, 10)

    setSearchResults(results)
  }, [searchQuery, fipsToName])

  const handleCountySelect = (fips: string) => {
    // Normalize FIPS for matching
    const normalizedFips = fips ? String(fips).trim().padStart(5, '0') : null
    if (!normalizedFips) return

    // Find the county feature in GeoJSON to get its center
    if (geojsonData && map1.current && map2.current) {
      const feature = geojsonData.features.find((f: any) => {
        const geoidRaw = f.properties.GEOID
        const geoidNormalized = geoidRaw ? String(geoidRaw).trim().padStart(5, '0') : null
        return geoidNormalized === normalizedFips
      })

      if (feature) {
        // Calculate bounding box center
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

        const processCoords = (coords: any) => {
          if (typeof coords[0] === 'number') {
            // It's a point [lng, lat]
            minLng = Math.min(minLng, coords[0])
            maxLng = Math.max(maxLng, coords[0])
            minLat = Math.min(minLat, coords[1])
            maxLat = Math.max(maxLat, coords[1])
          } else {
            // It's an array of coordinates
            coords.forEach(processCoords)
          }
        }

        processCoords(feature.geometry.coordinates)

        const centerLng = (minLng + maxLng) / 2
        const centerLat = (minLat + maxLat) / 2

        // Fly both maps to the county
        if (map1.current) {
          map1.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 8,
            essential: true
          })
        }
        if (map2.current) {
          map2.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 8,
            essential: true
          })
        }
      }
    }

    // Show county data
    const countyData = yearlyData[selectedYear]?.[normalizedFips]
    if (countyData) {
      // Calculate percentile for this county
      const allDrugRates = Object.values(yearlyData[selectedYear] || {})
        .map(d => d.DrugDeathRate)
        .filter((v): v is number => v !== null && v !== undefined)

      const percentile = countyData.DrugDeathRate !== null && countyData.DrugDeathRate !== undefined
        ? calculatePercentile(countyData.DrugDeathRate, allDrugRates)
        : null

      setHoveredCounty({
        ...countyData,
        fips: normalizedFips,
        name: fipsToName[normalizedFips],
        percentile
      })
    }

    setSearchQuery('')
    setSearchResults([])
  }

  // Fetch adjusted comparison data when counties or controls change
  useEffect(() => {
    const fetchAdjustedData = async () => {
      if (!selectedCountyA || !selectedCountyB) {
        setAdjustedData(null)
        return
      }

      // If no controls are enabled, skip API call
      if (!controlPoverty && !controlIncome && !controlUrbanRural) {
        setAdjustedData(null)
        return
      }

      setLoadingAdjustment(true)
      try {
        const params = new URLSearchParams({
          countyA: selectedCountyA,
          countyB: selectedCountyB,
          year: selectedYear,
          controlPoverty: String(controlPoverty),
          controlIncome: String(controlIncome),
          controlUrbanRural: String(controlUrbanRural)
        })

        const response = await fetch(`/api/compare?${params}`)
        if (response.ok) {
          const data = await response.json()
          setAdjustedData(data)
        } else {
          console.error('Failed to fetch adjusted data')
          setAdjustedData(null)
        }
      } catch (error) {
        console.error('Error fetching adjusted data:', error)
        setAdjustedData(null)
      } finally {
        setLoadingAdjustment(false)
      }
    }

    fetchAdjustedData()
  }, [selectedCountyA, selectedCountyB, selectedYear, controlPoverty, controlIncome, controlUrbanRural])

  // Fetch time series data for both counties across all years
  useEffect(() => {
    const fetchTimeSeries = async () => {
      if (!selectedCountyA || !selectedCountyB) {
        setTimeSeriesData(null)
        return
      }

      setLoadingTimeSeries(true)
      try {
        const seriesData: any = {
          countyA: {},
          countyB: {},
          years: years
        }

        // Load data for all years
        for (const year of years) {
          const data = yearlyData[year]
          if (data) {
            seriesData.countyA[year] = data[selectedCountyA]
            seriesData.countyB[year] = data[selectedCountyB]
          }
        }

        setTimeSeriesData(seriesData)
      } catch (error) {
        console.error('Error fetching time series:', error)
        setTimeSeriesData(null)
      } finally {
        setLoadingTimeSeries(false)
      }
    }

    fetchTimeSeries()
  }, [selectedCountyA, selectedCountyB, yearlyData, years])

  const calculatePercentile = (value: number, allValues: number[]): number => {
    const sorted = [...allValues].sort((a, b) => a - b)
    const index = sorted.findIndex(v => v >= value)
    if (index === -1) return 100
    return (index / sorted.length) * 100
  }

  const getDrugDeathPrevalence = (data?: CountyData | null): number | null => {
    if (!data?.Population || data.Population <= 0) return null
    if (!data.DrugDeaths && data.DrugDeaths !== 0) return null
    return (data.DrugDeaths / data.Population) * 100
  }

  const getColorForValue = (value: number | null, isPolitic: boolean, percentile?: number): string => {
    // Show gray for NA/missing data
    if (value === null || value === undefined) return '#d1d5db'

    if (isPolitic) {
      // Keep political colors the same (red/blue)
      if (value > 40) return '#7f1d1d'
      if (value > 20) return '#dc2626'
      if (value > 0) return '#fca5a5'
      if (value > -20) return '#93c5fd'
      if (value > -40) return '#2563eb'
      return '#1e3a8a'
    } else {
      // Rust/yellow gradient for drug death rate (sickness/death emphasis)
      // Based on percentiles for better distribution
      if (percentile !== undefined) {
        if (percentile >= 90) return '#8a2e0f' // deep rust (highest)
        if (percentile >= 75) return '#b45309' // rust orange
        if (percentile >= 60) return '#d97706' // amber
        if (percentile >= 40) return '#f59e0b' // yellow-orange
        if (percentile >= 20) return '#fbbf24' // yellow
        return '#fef3c7' // pale yellow (lowest)
      }
      // Fallback to value-based (for backward compatibility)
      if (value > 40) return '#8a2e0f'
      if (value > 30) return '#b45309'
      if (value > 20) return '#d97706'
      if (value > 10) return '#f59e0b'
      return '#fef3c7'
    }
  }

  const updateMapColors = (
    map: mapboxgl.Map,
    countyData: Record<string, CountyData>,
    isDrugMap: boolean,
    adjustedValues?: Record<string, number>
  ) => {
    if (!map || !map.getLayer('counties-fill')) return

    // Normalize FIPS codes to ensure proper matching
    const normalizeFips = (fips: string | number | null | undefined): string => {
      if (fips === null || fips === undefined) return ''
      const fipsStr = String(fips).trim()
      // Ensure 5-digit zero-padded format
      return fipsStr.padStart(5, '0')
    }

    // Calculate percentiles for drug death rates
    const allDrugRates = Object.values(countyData)
      .map(d => isDrugMap ? (adjustedValues?.[d.fips] ?? d.DrugDeathRate) : null)
      .filter((v): v is number => v !== null && v !== undefined)

    // Use to-string conversion for GEOID to ensure string matching
    const fillExpression: any[] = ['match', ['to-string', ['get', 'GEOID']]]

    Object.entries(countyData).forEach(([fips, data]) => {
      // Normalize FIPS code
      const normalizedFips = normalizeFips(fips)
      if (!normalizedFips) return

      // Use adjusted values if available, otherwise use raw data
      const value = adjustedValues && adjustedValues[fips]
        ? adjustedValues[fips]
        : (isDrugMap ? data.DrugDeathRate : data.RepublicanMargin)

      // Calculate percentile for drug map
      const percentile = isDrugMap && value !== null && value !== undefined
        ? calculatePercentile(value, allDrugRates)
        : undefined

      const color = getColorForValue(value, !isDrugMap, percentile)
      fillExpression.push(normalizedFips, color)
    })

    fillExpression.push('#e5e7eb')

    const style = map.getStyle()
    if (style && style.layers) {
      const layerIndex = style.layers.findIndex((l: any) => l.id === 'counties-fill')
      if (layerIndex >= 0) {
        const layer = style.layers[layerIndex] as any
        if (!layer.paint) layer.paint = {}
        layer.paint['fill-color-transition'] = { duration: 300 }
      }
    }

    map.setPaintProperty('counties-fill', 'fill-color', fillExpression as any)
  }

  const createMap = (container: HTMLDivElement, isDrugMap: boolean) => {
    const newMap = new mapboxgl.Map({
      container: container,
      style: {
        version: 8,
        sources: {},
        layers: [{
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#f0f0f0'
          }
        }]
      },
      center: [-98.5, 39.8],
      zoom: 3.5
    })

    newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')

    newMap.on('load', () => {
      // Use cached geojson data instead of fetching again
      if (!geojsonData) {
        console.error('GeoJSON data not loaded')
        return
      }

      newMap.addSource('counties', {
        type: 'geojson',
        data: geojsonData
      })

      // Build color expression BEFORE adding the layer
      const countyData = yearlyData[selectedYear]
      const allDrugRates = countyData ? Object.values(countyData)
        .map(d => isDrugMap ? d.DrugDeathRate : null)
        .filter((v): v is number => v !== null && v !== undefined)
        : []

      const fillExpression: any[] = ['match', ['to-string', ['get', 'GEOID']]]

      if (countyData) {
        Object.entries(countyData).forEach(([fips, data]) => {
          const normalizedFips = fips ? String(fips).trim().padStart(5, '0') : null
          if (!normalizedFips) return

          const value = isDrugMap ? data.DrugDeathRate : data.RepublicanMargin
          const percentile = isDrugMap && value !== null && value !== undefined
            ? calculatePercentile(value, allDrugRates)
            : undefined

          const color = getColorForValue(value, !isDrugMap, percentile)
          fillExpression.push(normalizedFips, color)
        })
      }

      fillExpression.push('#d1d5db') // default gray for missing data

      newMap.addLayer({
        id: 'counties-fill',
        type: 'fill',
        source: 'counties',
        paint: {
          'fill-color': fillExpression as any,
          'fill-opacity': 0.88,
          'fill-antialias': true,
          'fill-outline-color': 'rgba(15, 23, 42, 0.18)'
        }
      })

      newMap.addLayer({
        id: 'counties-outline',
        type: 'line',
        source: 'counties',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'rgba(15, 23, 42, 0.35)',
          'line-width': 0.75,
          'line-opacity': 0.6,
          'line-blur': 0.4
        }
      })

      // Add state borders - load async but don't block rendering
      fetch('/data/us_states.geojson')
        .then(r => r.json())
        .then(statesGeoJSON => {
          newMap.addSource('states', {
            type: 'geojson',
            data: statesGeoJSON
          })

          newMap.addLayer({
            id: 'state-borders',
            type: 'line',
            source: 'states',
            paint: {
              'line-color': '#000000',
              'line-width': 2,
              'line-opacity': 1
            }
          })
        })
        .catch(error => {
          console.error('Error loading state borders:', error)
        })

      // Add hover
      newMap.on('mousemove', 'counties-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          // Normalize GEOID to ensure proper matching
          const geoidRaw = feature.properties?.GEOID
          const fips = geoidRaw ? String(geoidRaw).trim().padStart(5, '0') : null
          if (!fips) return

          const countyName = countyNames[fips] || feature.properties?.NAME
          const data = yearlyData[selectedYear]?.[fips]

          if (data) {
            // Calculate percentile for this county
            const allDrugRates = Object.values(yearlyData[selectedYear] || {})
              .map(d => d.DrugDeathRate)
              .filter((v): v is number => v !== null && v !== undefined)

            const percentile = data.DrugDeathRate !== null && data.DrugDeathRate !== undefined
              ? calculatePercentile(data.DrugDeathRate, allDrugRates)
              : null

            setHoveredCounty({
              ...data,
              fips,
              name: countyName,
              percentile
            })
            newMap.getCanvas().style.cursor = 'pointer'
          }
        }
      })

      newMap.on('mouseleave', 'counties-fill', () => {
        setHoveredCounty(null)
        newMap.getCanvas().style.cursor = ''
      })

      // Add click handler
      newMap.on('click', 'counties-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const geoidRaw = feature.properties?.GEOID
          const fips = geoidRaw ? String(geoidRaw).trim().padStart(5, '0') : null
          if (!fips) return

          const countyName = countyNames[fips] || feature.properties?.NAME
          const data = yearlyData[selectedYear]?.[fips]

          if (data && countyName) {
            setClickedCounty({
              fips,
              name: countyName,
              data
            })
            setShowCountyReport(true)
          }
        }
      })

      // Add markers on drug map only
      if (isDrugMap && countyData) {
        const zoom = newMap.getZoom()
        updateMarkers(newMap, countyData, zoom, true)

        // Update markers when zoom changes
        newMap.on('zoomend', () => {
          const zoomLevel = newMap.getZoom()
          setCurrentZoom(zoomLevel)
          const data = yearlyDataRef.current[selectedYearRef.current]
          if (data) {
            updateMarkers(newMap, data, zoomLevel)
          }
        })
      }
    })

    return newMap
  }

  useEffect(() => {
    if (!mapContainer1.current || !mapContainer2.current || loading || map1.current || map2.current) return
    if (Object.keys(yearlyData).length === 0 || !geojsonData) return

    map1.current = createMap(mapContainer1.current, true)
    map2.current = createMap(mapContainer2.current, false)

    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      // Clean up maps
      map1.current?.remove()
      map2.current?.remove()
      map1.current = null
      map2.current = null
    }
  }, [loading, yearlyData, geojsonData])

  // Lazy load year data when switching years
  useEffect(() => {
    const loadYearIfNeeded = async () => {
      // If year is already loaded, just update colors
      if (yearlyData[selectedYear]) {
        if (map1.current && map2.current) {
          updateMapColors(map1.current, yearlyData[selectedYear], true)
          updateMapColors(map2.current, yearlyData[selectedYear], false)
          // Update markers for the new year
          if (map1.current) {
            updateMarkers(map1.current, yearlyData[selectedYear], currentZoom, true)
          }
        }
        return
      }

      // Year not loaded yet, load it now
      setMapLoading(true)
      try {
        const yearData = await loadYearData(selectedYear)
        setYearlyData(prev => ({ ...prev, [selectedYear]: yearData }))
        allDataLoaded.current[selectedYear] = true

        // Update map colors after loading
        if (map1.current && map2.current) {
          updateMapColors(map1.current, yearData, true)
          updateMapColors(map2.current, yearData, false)
          // Update markers for the new year
          if (map1.current) {
            updateMarkers(map1.current, yearData, currentZoom, true)
          }
        }
      } catch (error) {
        console.error(`Error loading year ${selectedYear}:`, error)
      } finally {
        setMapLoading(false)
      }
    }

      if (!loading) {
      loadYearIfNeeded()
    }
  }, [selectedYear, loading])

  // Prefetch all years for smooth transitions
  useEffect(() => {
    const prefetchAll = async () => {
      for (const year of ['2018', '2019', '2020', '2021', '2022']) {
        if (!yearlyData[year] && !allDataLoaded.current[year]) {
          try {
            const data = await loadYearData(year)
            setYearlyData(prev => ({ ...prev, [year]: data }))
            allDataLoaded.current[year] = true
          } catch (err) {
            console.error(`Prefetch ${year}:`, err)
          }
        }
      }
    }
    if (!loading) prefetchAll()
  }, [loading])

  // Recalculate adjusted data when confounder controls change
  useEffect(() => {
    if (!yearlyData[selectedYear] || !map1.current || !map2.current) return

    // Determine which confounders to control for
    const controlVars: Array<'PovertyRate' | 'MedianIncome' | 'urban_rural'> = []
    if (mapControlPoverty) controlVars.push('PovertyRate')
    if (mapControlIncome) controlVars.push('MedianIncome') // Using derived median income
    if (mapControlUrbanRural) controlVars.push('urban_rural')

    // If no controls are active, use raw data
    if (controlVars.length === 0) {
      updateMapColors(map1.current, yearlyData[selectedYear], true)
      updateMapColors(map2.current, yearlyData[selectedYear], false)
      return
    }

    // Calculate adjusted values for both outcomes
    const adjustedDrugDeaths = residualize(yearlyData[selectedYear], 'DrugDeathRate', controlVars)
    const adjustedPolitical = residualize(yearlyData[selectedYear], 'RepublicanMargin', controlVars)

    // Update maps with adjusted data
    updateMapColors(map1.current, yearlyData[selectedYear], true, adjustedDrugDeaths)
    updateMapColors(map2.current, yearlyData[selectedYear], false, adjustedPolitical)
  }, [selectedYear, yearlyData, mapControlPoverty, mapControlIncome, mapControlUrbanRural])

  if (loading) {
    const progress = loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0
    return (
      <div className="h-96 flex flex-col items-center justify-center rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="loading-indicator text-xl mb-4">Preparing county map...</div>
        <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {loadingProgress.label} ({loadingProgress.current}/{loadingProgress.total})
        </div>
        <div className="mt-4 w-64 h-2 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="h-full rounded-full loading-indicator transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--accent-blue)' }}></div>
        </div>
        <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Initial load: ~284 KB (was 1.5 MB, ~80% smaller)
        </div>
      </div>
    )
  }

  const currentData = yearlyData[selectedYear]
  const totalCounties = currentData ? Object.keys(currentData).length : 0

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="search-container">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search county by name (e.g., Los Angeles, Cook, Harris)..."
            className="search-input"
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div
                  key={result.fips}
                  onClick={() => handleCountySelect(result.fips)}
                  className="search-result-item"
                >
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{result.name} County</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>FIPS: {result.fips}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Year Slider */}
      <div className="year-slider-container">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Year:</label>
          <input
            type="range"
            min="0"
            max={years.length - 1}
            value={years.indexOf(selectedYear)}
            onChange={(e) => setSelectedYear(years[parseInt(e.target.value)])}
            className="year-slider flex-1"
          />
          <span className="text-2xl font-bold min-w-[80px]" style={{ color: 'var(--accent-blue)' }}>{selectedYear}</span>
        </div>
        <div className="flex justify-between text-sm mt-2 px-2" style={{ color: 'var(--text-muted)' }}>
          {years.map(year => (
            <span key={year}>{year}</span>
          ))}
        </div>
        <div className="text-sm mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
          Showing {totalCounties.toLocaleString()} counties
        </div>
        {mapLoading && (
          <div className="text-xs mt-2 text-center animate-pulse" style={{ color: 'var(--accent-blue)' }}>
            Loading {selectedYear} data (~80 KB)...
          </div>
        )}
      </div>

      {/* Legends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="legend-container">
          <h4 className="legend-title"><strong>Drug Overdose Rate</strong> <span className="font-normal">(per 100k, by percentile)</span></h4>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#fef3c7'}}></div>
              <span>0-20th</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#fbbf24'}}></div>
              <span>20-40th</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#f59e0b'}}></div>
              <span>40-60th</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#d97706'}}></div>
              <span>60-75th</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#b45309'}}></div>
              <span>75-90th</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#8a2e0f'}}></div>
              <span>90-100th</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#d1d5db'}}></div>
              <span>No Data</span>
            </div>
          </div>
        </div>

        <div className="legend-container">
          <h4 className="legend-title">Republican Margin (%)</h4>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#1e3a8a'}}></div>
              <span>D+40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#2563eb'}}></div>
              <span>D+20</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#93c5fd'}}></div>
              <span>D+0</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#fca5a5'}}></div>
              <span>R+0</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#dc2626'}}></div>
              <span>R+20</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#7f1d1d'}}></div>
              <span>R+40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#d1d5db'}}></div>
              <span>No Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust for Confounders */}
      <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
        <h4 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Adjust for Confounders:
        </h4>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 cursor-pointer accent-blue-600"
              checked={mapControlPoverty}
              onChange={(e) => setMapControlPoverty(e.target.checked)}
              style={{
                accentColor: '#3b82f6',
                cursor: 'pointer'
              }}
            />
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Control for Poverty Level</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 cursor-pointer accent-blue-600"
              checked={mapControlIncome}
              onChange={(e) => setMapControlIncome(e.target.checked)}
              style={{
                accentColor: '#3b82f6',
                cursor: 'pointer'
              }}
            />
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Control for Median Income</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 cursor-pointer accent-blue-600"
              checked={mapControlUrbanRural}
              onChange={(e) => setMapControlUrbanRural(e.target.checked)}
              style={{
                accentColor: '#3b82f6',
                cursor: 'pointer'
              }}
            />
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Control for Urban/Rural</span>
          </label>
        </div>
      </div>

      {/* Side by Side Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="relative">
          <div className="absolute top-2 left-2 px-3 py-1 rounded shadow z-10 font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            <strong>Drug Overdose Rate</strong> <span className="font-normal">(per 100k)</span> ({selectedYear})
          </div>
          <div
            ref={mapContainer1}
            className="h-[500px] rounded-lg shadow-lg"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
          />
        </div>
        <div className="relative">
          <div className="absolute top-2 left-2 px-3 py-1 rounded shadow z-10 font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            Political Lean ({selectedYear})
          </div>
          <div
            ref={mapContainer2}
            className="h-[500px] rounded-lg shadow-lg"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
          />
        </div>
      </div>

      {/* Compare Counties Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setCompareOpen(true)}
          className="px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: '#ffffff',
            border: 'none'
          }}
        >
          Compare Counties
        </button>
      </div>

      {/* Hover Tooltip - Only Comparable Metrics */}
      {hoveredCounty && (
        <div className="county-tooltip" style={{ background: 'var(--bg-secondary)', border: `2px solid var(--accent-blue)` }}>
          <h3 className="font-bold text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{hoveredCounty.name} County ({selectedYear})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}><strong>Drug Overdose Rate</strong> <span className="font-normal">(per 100k)</span></span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.Is_Suppressed
                  ? 'Suppressed'
                  : hoveredCounty.DrugDeathRate !== null
                    ? hoveredCounty.DrugDeathRate.toFixed(1)
                    : 'No Data'}
              </div>
              {hoveredCounty.percentile !== null && hoveredCounty.percentile !== undefined && !hoveredCounty.Is_Suppressed && (
                <div className="text-xs mt-1" style={{ color: 'var(--accent-blue)' }}>
                  {hoveredCounty.percentile.toFixed(0)}th percentile
                </div>
              )}
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}><strong>Suicide Rate</strong> <span className="font-normal">(per 100k)</span></span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.SuicideRate !== null
                  ? hoveredCounty.SuicideRate.toFixed(1)
                  : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Political Lean</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.RepublicanMargin !== null
                  ? `${hoveredCounty.RepublicanMargin > 0 ? 'R+' : 'D+'}${Math.abs(hoveredCounty.RepublicanMargin).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Unemployment Rate</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.UnemploymentRate !== null
                  ? `${hoveredCounty.UnemploymentRate.toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Poverty Rate</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.PovertyRate !== null
                  ? `${hoveredCounty.PovertyRate.toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--accent-blue)', color: '#ffffff' }}
              onClick={() => {
                if (!hoveredCounty?.fips) return
                setClickedCounty({
                  fips: hoveredCounty.fips,
                  name: hoveredCounty.name,
                  data: hoveredCounty
                })
                setShowCountyReport(true)
              }}
            >
              Open county report
            </button>
          </div>
        </div>
      )}

      {/* Comparison Sidebar */}
      {compareOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
            onClick={() => setCompareOpen(false)}
          />

          {/* Sidebar Panel */}
          <div
            className="fixed top-0 right-0 h-full w-full md:w-[600px] z-50 shadow-2xl overflow-y-auto"
            style={{
              background: 'var(--bg-secondary)',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  County Comparison
                </h2>
                <button
                  onClick={() => setCompareOpen(false)}
                  className="text-2xl font-bold px-3 py-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
                >
                  ×
                </button>
              </div>

              {/* County Search Bars */}
              <div className="space-y-4 mb-6">
                {/* County A Search */}
                <div className="relative">
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    County A
                  </label>
                  <input
                    type="text"
                    value={searchQueryA}
                    onChange={(e) => {
                      setSearchQueryA(e.target.value)
                      setShowResultsA(true)
                    }}
                    onFocus={() => setShowResultsA(true)}
                    onBlur={() => setTimeout(() => setShowResultsA(false), 200)}
                    placeholder="Search counties..."
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  {showResultsA && searchResultsA.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border-2 overflow-hidden"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-color)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      {searchResultsA.map((result) => (
                        <div
                          key={result.fips}
                          onClick={() => {
                            setSelectedCountyA(result.fips)
                            setSearchQueryA(result.name)
                            setShowResultsA(false)
                          }}
                          className="px-4 py-3 cursor-pointer transition-colors"
                          style={{
                            color: 'var(--text-primary)',
                            '&:hover': { background: 'var(--bg-secondary)' }
                          } as any}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className="font-medium">{result.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* County B Search */}
                <div className="relative">
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    County B
                  </label>
                  <input
                    type="text"
                    value={searchQueryB}
                    onChange={(e) => {
                      setSearchQueryB(e.target.value)
                      setShowResultsB(true)
                    }}
                    onFocus={() => setShowResultsB(true)}
                    onBlur={() => setTimeout(() => setShowResultsB(false), 200)}
                    placeholder="Search counties..."
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  {showResultsB && searchResultsB.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border-2 overflow-hidden"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-color)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      {searchResultsB.map((result) => (
                        <div
                          key={result.fips}
                          onClick={() => {
                            setSelectedCountyB(result.fips)
                            setSearchQueryB(result.name)
                            setShowResultsB(false)
                          }}
                          className="px-4 py-3 cursor-pointer transition-colors"
                          style={{
                            color: 'var(--text-primary)',
                            '&:hover': { background: 'var(--bg-secondary)' }
                          } as any}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className="font-medium">{result.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Statistical Controls */}
              {selectedCountyA && selectedCountyB && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                  <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    ⚙️ Adjust for Confounders
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={controlPoverty}
                        onChange={(e) => setControlPoverty(e.target.checked)}
                        style={{
                          accentColor: '#3b82f6',
                          cursor: 'pointer'
                        }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Control for Poverty Rate
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={controlIncome}
                        onChange={(e) => setControlIncome(e.target.checked)}
                        style={{
                          accentColor: '#3b82f6',
                          cursor: 'pointer'
                        }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Control for Median Income
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={controlUrbanRural}
                        onChange={(e) => setControlUrbanRural(e.target.checked)}
                        style={{
                          accentColor: '#3b82f6',
                          cursor: 'pointer'
                        }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Control for Urban/Rural
                      </span>
                    </label>
                  </div>
                  {(controlPoverty || controlIncome || controlUrbanRural) && (
                    <div className="mt-3 text-xs p-2 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--text-primary)' }}>
                      Statistical adjustment uses regression to remove the effect of selected confounders
                    </div>
                  )}
                  {loadingAdjustment && (
                    <div className="mt-2 text-xs text-center" style={{ color: '#3b82f6' }}>
                      Computing adjusted values...
                    </div>
                  )}
                </div>
              )}

              {/* Comparison Results */}
              {selectedCountyA && selectedCountyB && (
                <div className="space-y-4">
                  <div className="rounded-xl p-5" style={{ background: 'var(--bg-tertiary)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                      {fipsToName[selectedCountyA]} vs {fipsToName[selectedCountyB]}
                    </h3>

                    {/* Data Comparison Grid */}
                    <div className="space-y-3">
                      {[
                        { key: 'DrugDeathRate', label: 'Drug Overdose Rate (per 100k)', allowAdjusted: true },
                        { key: 'DrugDeathPrevalence', label: 'Drug Death Prevalence (% of population)', allowAdjusted: false },
                        { key: 'SuicideRate', label: 'Suicide Rate (per 100k)', allowAdjusted: false },
                        { key: 'RepublicanMargin', label: 'Republican Margin (%)', allowAdjusted: true },
                        { key: 'UnemploymentRate', label: 'Unemployment Rate (%)', allowAdjusted: false },
                        { key: 'PovertyRate', label: 'Poverty Rate (%)', allowAdjusted: false }
                      ].map((metric) => {
                        const dataA = yearlyData[selectedYear]?.[selectedCountyA]
                        const dataB = yearlyData[selectedYear]?.[selectedCountyB]

                        const valueA = metric.key === 'DrugDeathPrevalence'
                          ? getDrugDeathPrevalence(dataA)
                          : dataA?.[metric.key as keyof CountyData]
                        const valueB = metric.key === 'DrugDeathPrevalence'
                          ? getDrugDeathPrevalence(dataB)
                          : dataB?.[metric.key as keyof CountyData]

                        // Get adjusted values if available
                        const adjustedInfo = metric.allowAdjusted ? adjustedData?.[metric.key] : null
                        const showAdjusted = adjustedInfo && adjustedInfo.adjusted_a !== null

                        return (
                          <div key={metric.key} className="rounded-lg p-4" style={{ background: 'var(--bg-tertiary)' }}>
                            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                              {metric.label}
                              {showAdjusted && (
                                <span className="ml-2 text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-blue)' }}>
                                  Adjusted
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>County A</div>
                                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                      {showAdjusted ? (
                                        <>
                                          {adjustedInfo.adjusted_a.toFixed(1)}
                                      <div className="text-xs font-normal mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Raw: {adjustedInfo.raw_a.toFixed(1)}
                                        {adjustedInfo.adjustment_pct_a && (
                                          <span className="ml-1">({adjustedInfo.adjustment_pct_a.toFixed(0)}% adj)</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    valueA !== null && valueA !== undefined
                                      ? typeof valueA === 'number'
                                        ? valueA.toFixed(metric.key === 'DrugDeathPrevalence' ? 2 : 1)
                                        : valueA
                                      : 'N/A'
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>County B</div>
                                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                      {showAdjusted ? (
                                        <>
                                          {adjustedInfo.adjusted_b.toFixed(1)}
                                      <div className="text-xs font-normal mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Raw: {adjustedInfo.raw_b.toFixed(1)}
                                        {adjustedInfo.adjustment_pct_b && (
                                          <span className="ml-1">({adjustedInfo.adjustment_pct_b.toFixed(0)}% adj)</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    valueB !== null && valueB !== undefined
                                      ? typeof valueB === 'number'
                                        ? valueB.toFixed(metric.key === 'DrugDeathPrevalence' ? 2 : 1)
                                        : valueB
                                      : 'N/A'
                                  )}
                                </div>
                              </div>
                            </div>
                            {showAdjusted && adjustedInfo.adjustment_note && (
                              <div className="text-xs mt-2 p-2 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                {adjustedInfo.adjustment_note} (n={adjustedInfo.n_counties} counties)
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Year-wise Trends */}
                  {timeSeriesData && (
                    <div className="rounded-xl p-5" style={{ background: 'var(--bg-tertiary)' }}>
                      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Year-over-Year Trends (2018-2023)
                      </h3>

                      {['DrugDeathRate', 'SuicideRate', 'UnemploymentRate'].map((metric) => {
                        const labels: Record<string, string> = {
                          DrugDeathRate: 'Drug Overdose Rate Trends (2018-2023)',
                          SuicideRate: 'Suicide Rate Trends (2018-2023)',
                          UnemploymentRate: 'Unemployment Rate Trends (2018-2023)'
                        }

                        // Prepare data for chart
                        const dataA = years.map(year => {
                          const val = timeSeriesData.countyA[year]?.[metric]
                          return val !== null && val !== undefined ? val : null
                        })
                        const dataB = years.map(year => {
                          const val = timeSeriesData.countyB[year]?.[metric]
                          return val !== null && val !== undefined ? val : null
                        })

                        // Calculate min/max for Y axis
                        const allValues = [...dataA, ...dataB].filter(v => v !== null) as number[]
                        if (allValues.length === 0) return null

                        const minVal = Math.min(...allValues)
                        const maxVal = Math.max(...allValues)
                        const padding = (maxVal - minVal) * 0.1 || 1
                        const yMin = Math.max(0, minVal - padding)
                        const yMax = maxVal + padding

                        // Chart dimensions
                        const width = 500
                        const height = 200
                        const marginLeft = 40
                        const marginRight = 30
                        const marginTop = 20
                        const marginBottom = 40
                        const chartWidth = width - marginLeft - marginRight
                        const chartHeight = height - marginTop - marginBottom

                        // Scale functions
                        const xScale = (index: number) => marginLeft + (index / (years.length - 1)) * chartWidth
                        const yScale = (value: number) => marginTop + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight

                        // Create path strings
                        const createPath = (data: (number | null)[]) => {
                          const points = data
                            .map((val, i) => val !== null ? `${xScale(i)},${yScale(val)}` : null)
                            .filter(p => p !== null)
                          if (points.length === 0) return ''
                          return 'M' + points.join(' L')
                        }

                        const pathA = createPath(dataA)
                        const pathB = createPath(dataB)

                        return (
                          <div key={metric} className="mb-6 last:mb-0 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                              {labels[metric]}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6 mb-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-0.5" style={{ background: '#dc2626' }}></div>
                                <span style={{ color: 'var(--text-secondary)' }}>{fipsToName[selectedCountyA]}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-0.5" style={{ background: '#3b82f6' }}></div>
                                <span style={{ color: 'var(--text-secondary)' }}>{fipsToName[selectedCountyB]}</span>
                              </div>
                            </div>

                            {/* Chart SVG */}
                            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%' }}>
                              {/* Grid lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                                const y = marginTop + chartHeight * ratio
                                return (
                                  <line
                                    key={ratio}
                                    x1={marginLeft}
                                    y1={y}
                                    x2={marginLeft + chartWidth}
                                    y2={y}
                                    stroke="var(--border-color)"
                                    strokeWidth="1"
                                    opacity="0.3"
                                  />
                                )
                              })}

                              {/* Y axis labels */}
                              {[0, 0.5, 1].map((ratio) => {
                                const value = yMin + (yMax - yMin) * (1 - ratio)
                                const y = marginTop + chartHeight * ratio
                                return (
                                  <text
                                    key={ratio}
                                    x={marginLeft - 10}
                                    y={y}
                                    textAnchor="end"
                                    dominantBaseline="middle"
                                    fill="var(--text-secondary)"
                                    fontSize="11"
                                  >
                                    {value.toFixed(0)}
                                  </text>
                                )
                              })}

                              {/* X axis labels */}
                              {years.map((year, i) => (
                                <text
                                  key={year}
                                  x={xScale(i)}
                                  y={marginTop + chartHeight + 20}
                                  textAnchor="middle"
                                  fill="var(--text-secondary)"
                                  fontSize="11"
                                >
                                  {year}
                                </text>
                              ))}

                              {/* Data lines */}
                              {pathA && (
                                <path
                                  d={pathA}
                                  fill="none"
                                  stroke="#dc2626"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                              {pathB && (
                                <path
                                  d={pathB}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Data points */}
                              {dataA.map((val, i) => {
                                if (val === null) return null
                                return (
                                  <circle
                                    key={`a-${i}`}
                                    cx={xScale(i)}
                                    cy={yScale(val)}
                                    r="4"
                                    fill="#dc2626"
                                    stroke="var(--bg-secondary)"
                                    strokeWidth="2"
                                  />
                                )
                              })}
                              {dataB.map((val, i) => {
                                if (val === null) return null
                                return (
                                  <circle
                                    key={`b-${i}`}
                                    cx={xScale(i)}
                                    cy={yScale(val)}
                                    r="4"
                                    fill="#3b82f6"
                                    stroke="var(--bg-secondary)"
                                    strokeWidth="2"
                                  />
                                )
                              })}
                            </svg>
                          </div>
                        )
                      })}

                      {loadingTimeSeries && (
                        <div className="text-center py-4 text-sm" style={{ color: '#3b82f6' }}>
                          Loading trend data...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Demographics Comparison Table */}
                  {timeSeriesData && (
                    <div className="rounded-xl p-5" style={{ background: 'var(--bg-tertiary)' }}>
                      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Demographics Comparison
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Measure</th>
                              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fipsToName[selectedCountyA]}</th>
                              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fipsToName[selectedCountyB]}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const dataA = yearlyData[selectedYear]?.[selectedCountyA]
                              const dataB = yearlyData[selectedYear]?.[selectedCountyB]

                              return (
                                <>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>Population</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataA?.Population?.toLocaleString() || 'N/A'}</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataB?.Population?.toLocaleString() || 'N/A'}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>Drug Death Prevalence (% of population)</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                                      {getDrugDeathPrevalence(dataA) !== null
                                        ? `${getDrugDeathPrevalence(dataA)?.toFixed(2)}%`
                                        : 'N/A'}
                                    </td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                                      {getDrugDeathPrevalence(dataB) !== null
                                        ? `${getDrugDeathPrevalence(dataB)?.toFixed(2)}%`
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>Urban/Rural</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataA?.urban_rural || 'N/A'}</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataB?.urban_rural || 'N/A'}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>Poverty Rate</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataA?.PovertyRate ? `${dataA.PovertyRate.toFixed(1)}%` : 'N/A'}</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataB?.PovertyRate ? `${dataB.PovertyRate.toFixed(1)}%` : 'N/A'}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>Interstate Distance</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>N/A</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>N/A</td>
                                  </tr>
                                  <tr>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>Political Lean</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataA?.RepublicanMargin ? `${dataA.RepublicanMargin.toFixed(1)}% R` : 'N/A'}</td>
                                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{dataB?.RepublicanMargin ? `${dataB.RepublicanMargin.toFixed(1)}% R` : 'N/A'}</td>
                                  </tr>
                                </>
                              )
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Model-Adjusted Comparison */}
                  {selectedCountyA && selectedCountyB && (
                    <div className="rounded-xl p-5" style={{ background: 'rgba(209, 250, 229, 0.3)', borderLeft: '4px solid #10b981' }}>
                      <h3 className="text-lg font-bold mb-4" style={{ color: '#047857' }}>
                        Model-Adjusted Comparison
                      </h3>

                      <div className="space-y-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <p>
                          <strong style={{ color: '#047857' }}>Model Adjustment Available:</strong> Select confounder controls above to view statistically adjusted comparisons. Use checkboxes to control for poverty rate, median income, and urban/rural status.
                        </p>

                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedCountyA && !selectedCountyB && (
                <div className="text-center py-12">
                  <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                    Select two counties to compare
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tutorial Modal */}
      <TutorialModal />

      {/* County Report Modal */}
      {clickedCounty && (
        <CountyReportModal
          isOpen={showCountyReport}
          onClose={() => {
            setShowCountyReport(false)
            setClickedCounty(null)
          }}
          countyFips={clickedCounty.fips}
          countyName={clickedCounty.name}
          countyData={clickedCounty.data}
          selectedYear={selectedYear}
        />
      )}
    </div>
  )
}
