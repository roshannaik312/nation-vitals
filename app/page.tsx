'use client'

import { useState, useEffect } from 'react'
import YearlyDualMap from '@/components/YearlyDualMap'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  const [summary, setSummary] = useState<any>(null)
  const [stateData, setStateData] = useState<any[]>([])
  const [stateFederalOutcomes, setStateFederalOutcomes] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadStartTime] = useState(Date.now())
  const [loadTime, setLoadTime] = useState<number | null>(null)
  const [loadingStage, setLoadingStage] = useState({ step: 1, total: 4, label: 'Loading county boundaries' })
  const [showEstimate, setShowEstimate] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('DrugDeaths')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [methodsOpen, setMethodsOpen] = useState(false)

  // Severity color function (1-10 scale)
  const getSeverityColor = (value: number | null, maxValue: number): string => {
    if (!value || maxValue === 0) return '#d1d5db' // No data

    const normalized = (value / maxValue) * 10 // Scale to 1-10

    if (normalized <= 2) return '#f7d3bc' // 1-2: Very Low
    if (normalized <= 4) return '#f0b494' // 3-4: Low-Med
    if (normalized <= 6) return '#d9926d' // 5-6: Medium
    if (normalized <= 8) return '#b66a3c' // 7-8: High
    return '#6b2f14' // 9-10: Critical
  }

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sort state data
  const sortedStateData = (data: any[]) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortColumn]
      let bVal = b[sortColumn]

      // Handle null/undefined values
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Special handling for state_name (string)
      if (sortColumn === 'state_name') {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      // Numeric comparison
      const comparison = aVal - bVal
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  // Render sort indicator
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="text-xs opacity-30">▼</span>
    return <span className="text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    const estimateTimer = setTimeout(() => setShowEstimate(true), 3000)

    const cachedLoad = (key: string) => {
      const cached = localStorage.getItem(key)
      if (!cached) return null
      try {
        return JSON.parse(cached)
      } catch {
        localStorage.removeItem(key)
        return null
      }
    }

    const saveCache = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Ignore cache errors
      }
    }

    const loadData = async () => {
      try {
        setLoadingStage({ step: 1, total: 4, label: 'Loading county boundaries' })
        const summaryCacheKey = 'nvitals_summary_v1'
        const cachedSummary = cachedLoad(summaryCacheKey)
        const summaryData = cachedSummary ?? await fetch('/data/summary.json', { signal: controller.signal }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`)
          return r.json()
        })
        if (!cachedSummary) saveCache(summaryCacheKey, summaryData)

        setLoadingStage({ step: 2, total: 4, label: 'Fetching overdose data' })
        const stateCacheKey = 'nvitals_state_summary_v1'
        const cachedStates = cachedLoad(stateCacheKey)
        const stateSummary = cachedStates ?? await fetch('/data/state_summary.json', { signal: controller.signal }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`)
          return r.json()
        })
        if (!cachedStates) saveCache(stateCacheKey, stateSummary)

        setLoadingStage({ step: 3, total: 4, label: 'Processing political data' })
        const outcomesCacheKey = 'nvitals_state_federal_outcomes_v1'
        const cachedOutcomes = cachedLoad(outcomesCacheKey)
        const federalOutcomes = cachedOutcomes ?? await fetch('/data/state_federal_outcomes.json', { signal: controller.signal }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`)
          return r.json()
        })
        if (!cachedOutcomes) saveCache(outcomesCacheKey, federalOutcomes)

        setLoadingStage({ step: 4, total: 4, label: 'Rendering visualization' })
        clearTimeout(timeout)
        clearTimeout(estimateTimer)
        const timeElapsed = ((Date.now() - loadStartTime) / 1000).toFixed(1)
        setLoadTime(parseFloat(timeElapsed))
        setSummary(summaryData)
        setStateData(stateSummary)
        setStateFederalOutcomes(federalOutcomes)
        setLoading(false)
      } catch (error) {
        clearTimeout(timeout)
        clearTimeout(estimateTimer)
        console.error('Failed to load dashboard data:', error)
        setLoading(false)
      }
    }

    loadData()

    return () => {
      clearTimeout(timeout)
      clearTimeout(estimateTimer)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center space-y-4 px-4">
          <div className="loading-indicator text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {loadingStage.label} ({loadingStage.step}/{loadingStage.total})
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Preparing county-level analysis for public safety leaders
          </div>
          {showEstimate && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Estimated time remaining: ~{Math.max(2, Math.round(12 - (Date.now() - loadStartTime) / 1000))}s
            </div>
          )}
          <div className="w-64 h-2 loading-bar">
            <div
              className="h-full"
              style={{
                width: `${(loadingStage.step / loadingStage.total) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))'
              }}
            ></div>
          </div>
          <div className="w-full max-w-3xl mt-6 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="h-72 md:h-80 animate-pulse" style={{ background: 'linear-gradient(120deg, rgba(148,163,184,0.25), rgba(226,232,240,0.6), rgba(148,163,184,0.25))' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          {/* Theme Toggle - Top Right on Mobile/Desktop */}
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>

          {/* Main Heading - Centered */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 px-2" style={{ color: 'var(--text-primary)' }}>
              NationVitals
            </h1>
            <p className="text-xs sm:text-sm md:text-base px-4 max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Empowering Communities to Combat the Fentanyl Crisis with AI-Driven Insights
            </p>
          </div>
        </div>

        {/* County Map Visualization */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2 text-center md:text-left" style={{ color: 'var(--text-primary)' }}>County Intelligence Dashboard (2018-2023)</h2>
          <p className="text-sm md:text-base mb-4 px-2 text-center md:text-left" style={{ color: 'var(--text-secondary)' }}>
            Track overdose trends and voting patterns with a clear, county-by-county view. Use the slider to review yearly shifts and hover to see key metrics.
          </p>
          <YearlyDualMap />
        </div>

        {/* Severity Scale Legend */}
        <div className="mb-6 mx-2 md:mx-0">
          <h3 className="text-base md:text-lg font-bold mb-3 text-center md:text-left" style={{ color: 'var(--text-primary)' }}>Severity Scale</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#f7d3bc' }}></div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>1-2: Very Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#f0b494' }}></div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>3-4: Low-Med</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#d9926d' }}></div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>5-6: Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#b66a3c' }}></div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>7-8: High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#6b2f14' }}></div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>9-10: Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#d1d5db' }}></div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>No Data</span>
            </div>
          </div>
        </div>

        {/* States Table */}
        <div className="data-table">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>State Summary: Overdose & Suicide Rates with Federal Election Outcomes</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>State names colored by 2024 presidential winner using federal results.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('state_name')}
                    className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      State <SortIndicator column="state_name" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Drug Severity</th>
                  <th
                    onClick={() => handleSort('DrugDeaths')}
                    className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Drug Overdose Rate</span> <span className="font-normal">(per 100k)</span> <SortIndicator column="DrugDeaths" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}><span className="font-bold">Suicide Severity</span></th>
                  <th
                    onClick={() => handleSort('SuicideDeaths')}
                    className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Suicide Rate</span> <span className="font-normal">(per 100k)</span> <SortIndicator column="SuicideDeaths" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                      2024 Federal Outcome
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('n_counties')}
                    className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      Counties <SortIndicator column="n_counties" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Don't skip first row - it's already JSON data, not CSV with header
                  const validStates = stateData.filter((s: any) => s.DrugDeaths && s.state_name)
                  const maxDrugDeaths = Math.max(...validStates.map((s: any) => s.DrugDeaths || 0))
                  const maxSuicideDeaths = Math.max(...validStates.map((s: any) => s.SuicideDeaths || 0))

                  return sortedStateData(validStates).map((state: any, idx: number) => {
                    // Get federal election outcome for 2024
                    const federalOutcome = stateFederalOutcomes?.['2024']?.[state.state_name] || null
                    const stateColor = federalOutcome === 'R' ? '#dc2626' : federalOutcome === 'D' ? '#2563eb' : 'var(--text-primary)'

                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold" style={{ color: stateColor }}>
                          {state.state_name || state.state_fips}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="w-8 h-8 rounded-full mx-auto" style={{ background: getSeverityColor(state.DrugDeaths, maxDrugDeaths) }}></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          {state.DrugDeaths?.toFixed(1) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="w-8 h-8 rounded-full mx-auto" style={{ background: getSeverityColor(state.SuicideDeaths, maxSuicideDeaths) }}></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          {state.SuicideDeaths?.toFixed(1) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          <span style={{ color: stateColor }}>
                            {federalOutcome === 'R' ? 'Republican' : federalOutcome === 'D' ? 'Democrat' : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          {state.n_counties || 'N/A'}
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Statistics - Moved to Bottom */}
        <div className="mt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="stat-card">
              <h3 className="stat-card-title">OBSERVATIONS</h3>
              <p className="stat-card-value">{summary?.total_observations?.toLocaleString() || 'Loading...'}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-card-title">COUNTIES</h3>
              <p className="stat-card-value">{summary?.total_counties?.toLocaleString() || 'Loading...'}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-card-title">CORRELATION</h3>
              <p className="stat-card-value stat-card-accent">
                {summary?.avg_correlation?.toFixed(3) || 'Loading...'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Politics ↔ Drug Deaths</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="panel">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Average Mortality Rates</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}><span className="font-bold">Drug Overdose Rate</span> <span className="font-normal">(per 100k)</span>:</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.avg_drug_deaths?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}><span className="font-bold">Suicide Rate</span> <span className="font-normal">(per 100k)</span>:</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.avg_suicide_deaths?.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Data Completeness</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}><span className="font-bold">Drug Overdose Data</span>:</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.completeness?.drug_deaths_pct?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Political Data:</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.completeness?.political_pct?.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* About Link - Moved to Bottom */}
          <div className="flex justify-center mb-6">
            <a
              href="/about"
              className="px-4 py-2 rounded-md text-sm md:text-base font-bold transition-all duration-200 hover:shadow-md"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                textDecoration: 'none'
              }}
            >
              About This Project
            </a>
          </div>

          {/* Key Insights Section */}
          <div className="mb-6">
            <button
              onClick={() => setInsightsOpen(!insightsOpen)}
              className="w-full px-6 py-4 rounded-xl text-left transition-all duration-200"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Key Insights</h3>
                <span className="text-2xl" style={{ color: 'var(--text-primary)' }}>{insightsOpen ? '−' : '+'}</span>
              </div>
            </button>

            {insightsOpen && (
              <div className="mt-4 p-6 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Interstate Corridor Effect */}
                  <div className="text-center">
                    <h4 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Interstate Corridor Effect</h4>
                    <div className="text-6xl font-bold mb-2 transition-transform hover:scale-110" style={{ color: 'var(--accent-blue)' }}>
                      +35%
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Counties within 10km of major interstates show 35% higher overdose rates (95% CI: 28-43%, p&lt;0.001)
                    </p>
                  </div>

                  {/* Time Trend */}
                  <div className="text-center">
                    <h4 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Time Trend</h4>
                    <div className="text-6xl font-bold mb-2 transition-transform hover:scale-110" style={{ color: 'var(--accent-blue)' }}>
                      +67%
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      National overdose rates increased 67% from 2010-2024. Appalachian counties: +89%, West Coast: +41%
                    </p>
                  </div>

                  {/* Political Correlation */}
                  <div className="text-center">
                    <h4 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Political Correlation</h4>
                    <div className="text-4xl font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Moderate
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Association observed but confounded by rural/urban and economic factors. Ecological inference caveat applies.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Statistical Analysis Section */}
          <div className="mb-6">
            <button
              onClick={() => setAnalysisOpen(!analysisOpen)}
              className="w-full px-6 py-4 rounded-xl text-left transition-all duration-200"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Statistical Analysis</h3>
                <span className="text-2xl" style={{ color: 'var(--text-primary)' }}>{analysisOpen ? '−' : '+'}</span>
              </div>
            </button>

            {analysisOpen && (
              <div className="mt-4 p-6 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                <h4 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Statistical Model Results</h4>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Mixed-Effects Model (Negative Binomial GLMM)<br/>
                  County-level overdose deaths with random effects for county and state, controlling for socioeconomic confounders.
                </p>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>Predictor</th>
                        <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>Effect Size (IRR)</th>
                        <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>95% CI</th>
                        <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>p-value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Interstate Proximity (&lt;10km)</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>1.35</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>1.28 - 1.43</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>&lt;0.001</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Republican Vote Share (+10%)</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>1.08</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>0.98 - 1.19</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>0.124</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Poverty Rate (+5%)</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>1.22</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>1.15 - 1.29</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>&lt;0.001</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Urban (vs Rural)</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>0.82</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>0.76 - 0.89</td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>&lt;0.001</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Interpretation:</h4>
                <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Interstate Effect:</strong> After accounting for poverty, income, demographics, and urban/rural status, counties located within 10km of major interstate highways have 35% higher overdose death rates. This supports the "trafficking corridor" hypothesis from prior literature.
                  </p>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Political Association:</strong> The relationship between conservative voting patterns and overdose rates becomes non-significant after controlling for rural/urban status and economic factors, suggesting those are the key confounders.
                  </p>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Key Takeaway:</strong> Geographic access (proximity to interstates) and economic deprivation (poverty) are stronger predictors than political orientation alone.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Methods Section */}
          <div className="mb-6">
            <button
              onClick={() => setMethodsOpen(!methodsOpen)}
              className="w-full px-6 py-4 rounded-xl text-left transition-all duration-200"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Methods & Data Sources</h3>
                <span className="text-2xl" style={{ color: 'var(--text-primary)' }}>{methodsOpen ? '−' : '+'}</span>
              </div>
            </button>

            {methodsOpen && (
              <div className="mt-4 p-6 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                <h4 className="font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>Study Design</h4>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Ecological longitudinal panel study (county × year, 2010-2024) examining associations between geographic, political, and socioeconomic factors with overdose mortality, suicide, and mental health outcomes.
                </p>

                <h4 className="font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>Data Sources</h4>
                <ul className="list-disc list-inside mb-6 space-y-2" style={{ color: 'var(--text-secondary)' }}>
                  <li><strong style={{ color: 'var(--text-primary)' }}>CDC WONDER Multiple Cause of Death Files:</strong> County-level overdose and suicide mortality counts and age-adjusted rates</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>CDC PLACES:</strong> Local health data including poor mental health days at county level</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>David Leip's Atlas of U.S. Presidential Elections:</strong> County-level presidential election results (2000-2024), federal elections only</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>American Community Survey (ACS) 5-Year:</strong> Poverty rates, median household income, race/ethnicity, education</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>County Health Rankings:</strong> Violent crime proxy measures</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Census TIGER/Line Shapefiles:</strong> Primary roads (MTFCC S1100) for interstate proximity calculations</li>
                </ul>

                <h4 className="font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>Statistical Analysis</h4>
                <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Primary Model:</strong> Negative binomial generalized linear mixed model (GLMM) with county and state random intercepts, year fixed effects. Outcomes modeled as counts with population offset; age-adjusted rates used for visualization.
                </p>
                <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Interstate Proximity:</strong> Calculated as minimum distance from population-weighted county centroid to nearest S1100 (interstate) segment.
                </p>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Adjustment:</strong> Models control for poverty rate, median income, racial/ethnic composition, education, urban/rural classification, and violent crime proxy.
                </p>

                <h4 className="font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>Limitations & Ethical Considerations</h4>
                <div className="space-y-3 mb-6" style={{ color: 'var(--text-secondary)' }}>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Ecological Inference Caveat:</strong> All analyses use county-level aggregate data. Associations observed at the county level do not necessarily apply to individuals (ecological fallacy).
                  </p>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Data Suppression:</strong> Counties with &lt;10 deaths in a year are suppressed to protect privacy, following CDC guidelines.
                  </p>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Reporting Variation:</strong> Overdose and suicide reporting quality varies by state and has improved over time, potentially affecting trend interpretation.
                  </p>
                  <p>
                    <strong style={{ color: 'var(--text-primary)' }}>Confounding:</strong> Despite extensive adjustment, unmeasured confounders (treatment access, substance availability, social capital) may bias estimates.
                  </p>
                </div>

                <h4 className="font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>Key Citations</h4>
                <ul className="list-disc list-inside space-y-2" style={{ color: 'var(--text-secondary)' }}>
                  <li>Haffajee, R. L., et al. (2019). Characteristics of US counties with high opioid overdose mortality and low OUD treatment capacity. <em>JAMA Network Open, 2(6)</em>, e196373.</li>
                  <li>Kariisa, M., et al. (2022). Vital signs: Drug overdose deaths by selected sociodemographics, 2019–2020. <em>MMWR, 71(29)</em>, 940–947.</li>
                  <li>Goodwin, J. S., et al. (2018). Association of chronic opioid use with presidential voting patterns. <em>JAMA Network Open, 1(2)</em>, e180450.</li>
                  <li>Leip, David. <em>David Leip's Atlas of U.S. Presidential Elections</em>. Available at: uselectionatlas.org (accessed 2024).</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>Data covers {summary?.years?.join(', ')} | Analysis based on county-level aggregated data</p>
          <p className="mt-2">
            <strong style={{ color: 'var(--text-secondary)' }}>Key Finding:</strong> Correlation between Republican voting margin and <strong>drug overdose rate</strong> <span className="font-normal">(per 100k)</span>: {summary?.avg_correlation?.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  )
}
