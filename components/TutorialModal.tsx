'use client'

import { useState, useEffect } from 'react'

interface TutorialStep {
  title: string
  content: string[]
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to the Drug Overdose Crisis Tracker',
    content: [
      'This interactive tool helps you understand drug overdose trends across U.S. counties',
      'Search for and compare counties',
      'Explore how risks vary across the country',
      'See how political factors correlate with overdose rates'
    ]
  },
  {
    title: 'Interactive Map Features',
    content: [
      'Hover over any county to see detailed statistics',
      'The map shows county-level data colored by drug overdose rates',
      'Darker purple indicates higher overdose rates (higher percentile)',
      'Use the year slider to see trends from 2018-2023'
    ]
  },
  {
    title: 'Search and Compare Counties',
    content: [
      'Use the search bar to find specific counties',
      'Click "Compare Counties" to analyze two counties side-by-side',
      'View time-series trends and demographic comparisons',
      'Apply statistical controls for poverty, income, and urban/rural status'
    ]
  },
  {
    title: 'County Details',
    content: [
      'Click on any county to view detailed information',
      'Access comprehensive reports with graphs and trends',
      'Share or download county-specific data',
      'Compare against state and national averages'
    ]
  }
]

export default function TutorialModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [doNotShowAgain, setDoNotShowAgain] = useState(false)

  useEffect(() => {
    // Check if tutorial has been shown before
    const hasSeenTutorial = localStorage.getItem('nvitals_tutorial_seen')
    if (!hasSeenTutorial) {
      setIsOpen(true)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    if (doNotShowAgain) {
      localStorage.setItem('nvitals_tutorial_seen', 'true')
    }
    setIsOpen(false)
    setCurrentStep(0)
  }

  if (!isOpen) return null

  const step = tutorialSteps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === tutorialSteps.length - 1

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close tutorial"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {step.title}
          </h2>
          <div className="space-y-3">
            {step.content.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full mt-2" />
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Checkbox for "Do not show again" */}
        {isLastStep && (
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={doNotShowAgain}
                onChange={(e) => setDoNotShowAgain(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-600">Do not show tutorial again</span>
            </label>
          </div>
        )}

        {/* Footer with navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>

        {/* Progress text */}
        <div className="text-center mt-4 text-sm text-gray-500">
          Step {currentStep + 1} of {tutorialSteps.length}
        </div>
      </div>
    </div>
  )
}
