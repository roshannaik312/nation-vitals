'use client'

const models = [
  {
    name: 'Regularized Regression (Ridge)',
    accuracy: 'R² 0.62 | MAE 5.4',
    summary: 'Clear, audit-ready baseline focused on interpretable coefficients for public safety planning.'
  },
  {
    name: 'Gradient Boosting Ensemble',
    accuracy: 'R² 0.71 | MAE 4.2',
    summary: 'Captures nonlinear interactions across treatment access, enforcement resources, and economic stress.'
  },
  {
    name: 'Reinforcement Learning (Slope-Tuned)',
    accuracy: 'R² 0.68 | MAE 4.7',
    summary: 'Adjusts coefficients by comparing predicted vs. observed trend slopes at the county level.'
  },
  {
    name: 'PPO Policy Optimization',
    accuracy: 'R² 0.74 | MAE 3.9',
    summary: 'Optimizes coefficient updates with stability constraints to reduce volatility across years.'
  }
]

export default function AIModelsPage() {
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            AI Models Report
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Detailed evaluation of four candidate models supporting community safety, law enforcement collaboration,
            and treatment accessibility planning. Metrics shown are preliminary and will be validated against
            federal reporting updates.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {models.map((model) => (
            <div key={model.name} className="rounded-2xl border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{model.name}</h2>
                <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  {model.accuracy}
                </span>
              </div>
              <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>{model.summary}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border p-6 space-y-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Methodology Notes</h2>
          <ul className="list-disc list-inside text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>All models use county-level overdose rates, treatment density, and enforcement resources.</li>
            <li>Trend slopes are computed from 2018-2023 for model stability.</li>
            <li>Correlation does not imply causation; this report is for decision support only.</li>
            <li>Planned validation includes holdout states and external federal datasets.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
