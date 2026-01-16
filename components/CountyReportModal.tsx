'use client'

import { useState, useEffect } from 'react'

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

interface CountyReportModalProps {
  isOpen: boolean
  onClose: () => void
  countyFips: string
  countyName: string
  countyData: CountyData
  selectedYear: string
}

export default function CountyReportModal({
  isOpen,
  onClose,
  countyFips,
  countyName,
  countyData,
  selectedYear
}: CountyReportModalProps) {
  const [timeSeries, setTimeSeries] = useState<Record<string, CountyData>>({})
  const [loading, setLoading] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)

  useEffect(() => {
    if (isOpen && countyFips) {
      loadTimeSeries()
    }
  }, [isOpen, countyFips])

  const loadTimeSeries = async () => {
    setLoading(true)
    const years = ['2018', '2019', '2020', '2021', '2022', '2023']
    const data: Record<string, CountyData> = {}

    try {
      for (const year of years) {
        const cached = localStorage.getItem(`nvitals_year_${year}_v1`)
        if (cached) {
          const yearData = JSON.parse(cached)
          if (yearData[countyFips]) {
            data[year] = yearData[countyFips]
          }
        } else {
          const response = await fetch(`/api/years/${year}`)
          const yearData = await response.json()
          if (yearData[countyFips]) {
            data[year] = yearData[countyFips]
          }
        }
      }
      setTimeSeries(data)
    } catch (error) {
      console.error('Error loading time series:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | null | undefined, decimals = 1) => {
    if (num === null || num === undefined) return 'N/A'
    return num.toFixed(decimals)
  }

  const getStateName = (fips: string) => {
    const stateFips = fips.substring(0, 2)
    const stateMap: Record<string, string> = {
      '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas', '06': 'California',
      '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware', '11': 'District of Columbia',
      '12': 'Florida', '13': 'Georgia', '15': 'Hawaii', '16': 'Idaho', '17': 'Illinois',
      '18': 'Indiana', '19': 'Iowa', '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana',
      '23': 'Maine', '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
      '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska', '32': 'Nevada',
      '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico', '36': 'New York',
      '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio', '40': 'Oklahoma', '41': 'Oregon',
      '42': 'Pennsylvania', '44': 'Rhode Island', '45': 'South Carolina', '46': 'South Dakota',
      '47': 'Tennessee', '48': 'Texas', '49': 'Utah', '50': 'Vermont', '51': 'Virginia',
      '53': 'Washington', '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming'
    }
    return stateMap[stateFips] || 'Unknown State'
  }

  const copyLink = () => {
    const url = `${window.location.origin}?county=${countyFips}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const downloadData = () => {
    const csvContent = [
      ['Year', 'Drug Death Rate', 'Suicide Rate', 'Unemployment', 'Poverty Rate', 'Population'],
      ...Object.entries(timeSeries).map(([year, data]) => [
        year,
        data.DrugDeathRate || 'N/A',
        data.SuicideRate || 'N/A',
        data.UnemploymentRate || 'N/A',
        data.PovertyRate || 'N/A',
        data.Population || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${countyName.replace(/\s+/g, '_')}_${countyFips}_data.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  if (showFullReport) {
    return (
      <div className="fixed inset-0 bg-white z-[10001] overflow-y-auto">
        {/* Full Report View */}
        <div className="max-w-6xl mx-auto p-6">
          {/* Back Button */}
          <button
            onClick={() => setShowFullReport(false)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back to Main Map
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{countyName}</h1>
            <p className="text-xl text-gray-600">{getStateName(countyFips)} • FIPS: {countyFips}</p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm font-medium text-purple-600 mb-1">Drug Overdose Rate ({selectedYear})</div>
              <div className="text-2xl font-bold text-purple-900">
                {countyData.Is_Suppressed ? 'Suppressed' : formatNumber(countyData.DrugDeathRate)}
              </div>
              <div className="text-xs text-purple-600 mt-1">per 100,000 population</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm font-medium text-blue-600 mb-1">Suicide Rate ({selectedYear})</div>
              <div className="text-2xl font-bold text-blue-900">{formatNumber(countyData.SuicideRate)}</div>
              <div className="text-xs text-blue-600 mt-1">per 100,000 population</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm font-medium text-green-600 mb-1">Population ({selectedYear})</div>
              <div className="text-2xl font-bold text-green-900">
                {countyData.Population?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-green-600 mt-1">{countyData.urban_rural || 'Unknown'}</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-sm font-medium text-orange-600 mb-1">Political Lean ({selectedYear})</div>
              <div className="text-2xl font-bold text-orange-900">
                {countyData.RepublicanMargin !== null
                  ? `R+${formatNumber(countyData.RepublicanMargin, 1)}%`
                  : 'N/A'}
              </div>
              <div className="text-xs text-orange-600 mt-1">Republican margin</div>
            </div>
          </div>

          {/* Time Series Graph */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Drug Overdose Trend (2018-2023)</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading trend data...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(timeSeries).map(([year, data]) => {
                  const rate = data.DrugDeathRate || 0
                  const maxRate = Math.max(...Object.values(timeSeries).map(d => d.DrugDeathRate || 0), 50)
                  const widthPercent = (rate / maxRate) * 100

                  return (
                    <div key={year} className="flex items-center gap-4">
                      <div className="w-16 font-medium text-gray-700">{year}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-4 text-sm font-medium">
                          {data.Is_Suppressed ? 'Suppressed' : formatNumber(rate, 1)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Demographic Details Table */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Socioeconomic Indicators</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Indicator</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Poverty Rate</td>
                    <td className="py-3 px-4 text-right font-medium">{formatNumber(countyData.PovertyRate)}%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Unemployment Rate</td>
                    <td className="py-3 px-4 text-right font-medium">{formatNumber(countyData.UnemploymentRate)}%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Median Income (Estimated)</td>
                    <td className="py-3 px-4 text-right font-medium">
                      ${countyData.MedianIncome?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Setting</td>
                    <td className="py-3 px-4 text-right font-medium capitalize">
                      {countyData.urban_rural || 'Unknown'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </button>
            <button
              onClick={downloadData}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Data (CSV)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{countyName}</h2>
          <p className="text-gray-600">{getStateName(countyFips)} • FIPS: {countyFips}</p>
        </div>

        {/* Quick Stats */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700 font-medium">Drug Overdose Rate ({selectedYear})</span>
            <span className="text-purple-600 font-bold">
              {countyData.Is_Suppressed ? 'Suppressed' : `${formatNumber(countyData.DrugDeathRate)} per 100k`}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700 font-medium">Population</span>
            <span className="text-gray-900 font-bold">{countyData.Population?.toLocaleString() || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700 font-medium">Poverty Rate</span>
            <span className="text-gray-900 font-bold">{formatNumber(countyData.PovertyRate)}%</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700 font-medium">Political Lean</span>
            <span className="text-gray-900 font-bold">
              {countyData.RepublicanMargin !== null ? `R+${formatNumber(countyData.RepublicanMargin, 1)}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowFullReport(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Show Detailed Report
        </button>
      </div>
    </div>
  )
}
