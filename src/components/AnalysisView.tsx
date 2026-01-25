import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingDown, TrendingUp, AlertCircle, Info, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ErrorBar,
} from 'recharts';

interface ModelData {
  model_type: string;
  outcome: string;
  n_obs: number;
  coefficients: Record<string, number>;
  std_errors: Record<string, number>;
  p_values: Record<string, number>;
  conf_int_lower?: Record<string, number>;
  conf_int_upper?: Record<string, number>;
  aic?: number;
}

interface ModelSummary {
  n_observations: number;
  n_counties: number;
  years: number[];
  main_findings: {
    republican_margin_effect: number;
    republican_margin_pvalue: number;
    interpretation: string;
  };
  descriptive_stats: {
    avg_drug_deaths: number;
    avg_suicide_deaths: number;
    avg_republican_margin: number;
    avg_unemployment: number;
    avg_poverty: number;
  };
}

export function AnalysisView() {
  const [drugModel, setDrugModel] = useState<ModelData | null>(null);
  const [suicideModel, setSuicideModel] = useState<ModelData | null>(null);
  const [summary, setSummary] = useState<ModelSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const [drugRes, suicideRes, summaryRes] = await Promise.all([
          fetch('/data/glmm_drug_deaths.json'),
          fetch('/data/glmm_suicide.json'),
          fetch('/data/model_summary.json'),
        ]);
        
        if (drugRes.ok) setDrugModel(await drugRes.json());
        if (suicideRes.ok) setSuicideModel(await suicideRes.json());
        if (summaryRes.ok) setSummary(await summaryRes.json());
      } catch (e) {
        console.error('Failed to load model data', e);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading analysis data...</div>
      </div>
    );
  }

  const significantVars = drugModel ? Object.entries(drugModel.p_values)
    .filter(([key, pval]) => pval < 0.05 && !key.includes('Intercept'))
    .map(([key, pval]) => ({
      name: formatVarName(key),
      coefficient: drugModel.coefficients[key],
      pValue: pval,
      effect: Math.exp(drugModel.coefficients[key]) - 1, // Convert to % change
      direction: drugModel.coefficients[key] > 0 ? 'increase' : 'decrease',
    }))
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">X-Factor Analysis</h2>
        <p className="text-muted-foreground mt-1">
          Statistical model results showing relationships between political lean, socioeconomic factors, and health outcomes
        </p>
      </div>

      {/* Key Finding Alert */}
      {summary && (
        <Alert className="border-primary/50 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertTitle>Key Finding</AlertTitle>
          <AlertDescription className="mt-2">
            <strong>After controlling for poverty, income, education, and demographics:</strong>
            <p className="mt-2">
              {summary.main_findings.interpretation}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Effect size: {(summary.main_findings.republican_margin_effect * 100).toFixed(2)}% change per 1-point increase in Republican margin
              (p &lt; 0.0001)
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Model Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.n_observations.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">county-year records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Counties Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.n_counties.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">unique counties</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Time Period</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.years.length} Years</p>
            <p className="text-sm text-muted-foreground">
              {summary?.years[0]} - {summary?.years[summary.years.length - 1]}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Significant Predictors */}
      <Card>
        <CardHeader>
          <CardTitle>Significant Predictors of Drug Overdose Deaths</CardTitle>
          <CardDescription>
            Variables with statistically significant effects (p &lt; 0.05) after controlling for all other factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={significantVars} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  label={{ value: '% Change in Deaths', position: 'bottom', offset: -5 }}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Effect']}
                />
                <Bar dataKey="effect" radius={[0, 4, 4, 0]}>
                  {significantVars.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.effect > 0 ? 'hsl(0, 70%, 50%)' : 'hsl(145, 60%, 40%)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }} />
              <span className="text-muted-foreground">Increases deaths</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(145, 60%, 40%)' }} />
              <span className="text-muted-foreground">Decreases deaths</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Coefficients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drug Deaths Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Drug Overdose Model
            </CardTitle>
            <CardDescription>Negative Binomial GLM • {drugModel?.n_obs.toLocaleString()} observations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drugModel && Object.entries(drugModel.coefficients)
                .filter(([key]) => !key.includes('Intercept') && !key.includes('Year'))
                .map(([key, coef]) => {
                  const pVal = drugModel.p_values[key];
                  const isSignificant = pVal < 0.05;
                  const effect = (Math.exp(coef) - 1) * 100;
                  
                  return (
                    <div key={key} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isSignificant ? 'bg-muted/50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatVarName(key)}</span>
                        {isSignificant && <Badge variant="secondary" className="text-xs">p&lt;0.05</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {coef > 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                        <span className={`text-sm font-mono ${coef > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {effect > 0 ? '+' : ''}{effect.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Suicide Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Suicide Model
            </CardTitle>
            <CardDescription>Negative Binomial GLM • {suicideModel?.n_obs.toLocaleString()} observations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suicideModel && Object.entries(suicideModel.coefficients)
                .filter(([key]) => !key.includes('Intercept') && !key.includes('Year'))
                .map(([key, coef]) => {
                  const pVal = suicideModel.p_values[key];
                  const isSignificant = pVal < 0.05;
                  const effect = (Math.exp(coef) - 1) * 100;
                  
                  return (
                    <div key={key} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isSignificant ? 'bg-muted/50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatVarName(key)}</span>
                        {isSignificant && <Badge variant="secondary" className="text-xs">p&lt;0.05</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {coef > 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                        <span className={`text-sm font-mono ${coef > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {effect > 0 ? '+' : ''}{effect.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            This analysis uses <strong>Negative Binomial Generalized Linear Models (GLM)</strong> to examine 
            the relationship between county-level political lean and mortality outcomes while controlling for 
            potential confounding factors.
          </p>
          <h4>Controlled Variables</h4>
          <ul>
            <li><strong>Poverty Rate</strong> - Percentage of population below poverty line</li>
            <li><strong>Median Income</strong> - Median household income</li>
            <li><strong>Education</strong> - Percentage with Bachelor's degree or higher</li>
            <li><strong>Race/Ethnicity</strong> - White, Black, and Hispanic population percentages</li>
            <li><strong>Year Fixed Effects</strong> - Controls for time trends</li>
          </ul>
          <h4>Interpretation</h4>
          <p>
            Coefficients are expressed as percentage change in expected deaths for a one-unit increase in the predictor. 
            For example, a -0.71% effect for Republican Margin means that counties with 1 percentage point higher 
            Republican vote share have 0.71% fewer drug deaths, holding all other factors constant.
          </p>
          <h4>Limitations</h4>
          <p>
            This is an <strong>ecological study</strong> - findings describe county-level associations and cannot be 
            used to make inferences about individuals (ecological fallacy). Correlation does not imply causation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatVarName(name: string): string {
  const mappings: Record<string, string> = {
    'RepublicanMargin': 'Republican Margin',
    'UnemploymentRate': 'Unemployment Rate',
    'PovertyRate': 'Poverty Rate',
    'MedianIncome': 'Median Income',
    'BachelorsOrHigher': 'College Education',
    'WhiteAlone': '% White',
    'BlackAlone': '% Black',
    'HispanicLatino': '% Hispanic',
  };
  return mappings[name] || name.replace(/([A-Z])/g, ' $1').trim();
}
