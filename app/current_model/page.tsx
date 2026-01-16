'use client'

export default function CurrentModelPage() {
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Current Model Blueprint
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Draft modeling logic for county-level energy deficit and recovery risk scoring. These reference
            reproducible equations and are designed for clarity, auditability, and public safety decision-making.
          </p>
        </header>

        <section className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Model 1: Regularized Regression (Baseline)</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Objective: Fit an interpretable linear model for energy deficit using county indicators. The model
            highlights innovation, demographic stability, and migration stressors in a concise formula.
          </p>
          <pre className="text-xs overflow-x-auto rounded-lg p-4" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
{`# Model 1: Ridge Regression (interpretable baseline)
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

df = pd.read_csv("county_features.csv")
df["birth_death_ratio_sq"] = df["birth_death_ratio"] ** 2
df["migration_sq"] = df["migration_rate"] ** 2

X = df[["innovation_index", "birth_death_ratio_sq", "migration_sq",
        "treatment_access_index", "law_enforcement_index"]]
y = df["energy_deficit"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = Ridge(alpha=1.0)
model.fit(X_train, y_train)

pred = model.predict(X_test)
print("R2:", r2_score(y_test, pred))
print("MAE:", mean_absolute_error(y_test, pred))

# Formula:
# energy_deficit = v1*innovation_index + v2*(birth_death_ratio^2)
#                 + v3*(migration_rate^2) + v4*treatment_access_index
#                 + v5*law_enforcement_index`}
          </pre>
        </section>

        <section className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Model 2: Reinforcement Learning with Slope Feedback</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Objective: Improve the baseline formula by learning adjustments from county-level trend slopes.
            The slope data can be scraped and standardized from county/state identifiers to reward formulas
            that reduce forecast error.
          </p>
          <pre className="text-xs overflow-x-auto rounded-lg p-4" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
{`# Model 2: Reinforcement learning to tune coefficients
import numpy as np

coeffs = np.array([0.4, 0.2, 0.15, 0.15, 0.1])  # v1..v5
learning_rate = 0.01

def reward_fn(predicted, observed_slope):
    # Encourage alignment with county slope trend (lower absolute error)
    return -np.abs(predicted - observed_slope)

for episode in range(500):
    for county in counties:
        x = county.features  # normalized inputs
        observed = county.overdose_slope
        prediction = np.dot(coeffs, x)
        reward = reward_fn(prediction, observed)
        coeffs += learning_rate * reward * x  # policy update

coeffs = coeffs / np.sum(np.abs(coeffs))
print("Updated coefficients:", coeffs)`}
          </pre>
        </section>

        <section className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Model 3: PPO Policy Optimization</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Objective: Train a policy to recommend parameter adjustments under constraints like data sparsity
            and multi-year stability. PPO offers steady improvement without volatile updates.
          </p>
          <pre className="text-xs overflow-x-auto rounded-lg p-4" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
{`# Model 3: PPO policy training (conceptual)
import gym
from stable_baselines3 import PPO

env = gym.make("CountyTuning-v0")  # custom env with reward on slope alignment
model = PPO("MlpPolicy", env, learning_rate=3e-4, batch_size=256, n_steps=2048)
model.learn(total_timesteps=200_000)
model.save("ppo_county_tuning")`}
          </pre>
        </section>
      </div>
    </main>
  )
}
