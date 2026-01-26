import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Database, FileText, BarChart } from 'lucide-react';

interface DataSource {
  name: string;
  description: string;
  variables: string[];
  url: string;
  years: string;
  icon: 'database' | 'chart' | 'file';
}

const DATA_SOURCES: DataSource[] = [
  {
    name: 'CDC WONDER',
    description: 'Multiple Cause of Death Files - Provides county-level mortality counts for drug overdoses.',
    variables: ['Drug overdose deaths', 'Age-adjusted mortality rates'],
    url: 'https://wonder.cdc.gov',
    years: '2018-2023',
    icon: 'database',
  },
  {
    name: 'CDC PLACES',
    description: 'Local health data estimates for counties including mental health indicators.',
    variables: ['Poor mental health days', 'Health outcomes', 'Prevention measures'],
    url: 'https://www.cdc.gov/places',
    years: '2020-2023',
    icon: 'chart',
  },
  {
    name: 'MIT Election Data + Science Lab',
    description: 'County-level presidential election returns with validated vote counts.',
    variables: ['Political share', 'Vote share', 'Total votes'],
    url: 'https://electionlab.mit.edu',
    years: '2000-2024',
    icon: 'file',
  },
  {
    name: 'American Community Survey (ACS)',
    description: 'U.S. Census Bureau 5-year estimates providing detailed demographic and socioeconomic data.',
    variables: ['Poverty rate', 'Median income', 'Educational attainment', 'Race/ethnicity'],
    url: 'https://www.census.gov/programs-surveys/acs',
    years: '2018-2023',
    icon: 'database',
  },
  {
    name: 'County Health Rankings',
    description: 'Annual rankings measuring health outcomes and factors for every county.',
    variables: ['Violent crime rate', 'Health behaviors', 'Clinical care access'],
    url: 'https://www.countyhealthrankings.org',
    years: '2018-2023',
    icon: 'chart',
  },
  {
    name: 'USDA Rural-Urban Continuum',
    description: 'Classification scheme distinguishing metropolitan counties by urbanization level.',
    variables: ['Urban/rural classification', 'Metro status'],
    url: 'https://www.ers.usda.gov/data-products/rural-urban-continuum-codes',
    years: '2023',
    icon: 'file',
  },
];

const IconMap = {
  database: Database,
  chart: BarChart,
  file: FileText,
};

export function DataSourcesView() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Data Sources</h2>
        <p className="text-muted-foreground mt-1">
          NationVitals aggregates data from multiple authoritative public health and demographic sources.
        </p>
      </div>

      {/* Data Quality Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Badge variant="outline" className="border-amber-500 text-amber-600">Note</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Data Suppression:</strong> Counties with fewer than 10 deaths have data suppressed 
                by CDC to protect privacy. This affects primarily rural counties and may introduce bias.
              </p>
              <p className="mt-2">
                <strong>Ecological Study:</strong> All analyses are at the county level. Findings describe 
                associations between county characteristics and cannot be attributed to individuals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sources Grid */}
      <div className="grid gap-4">
        {DATA_SOURCES.map((source) => {
          const Icon = IconMap[source.icon];
          return (
            <Card key={source.name}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{source.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs">{source.years}</Badge>
                    </div>
                  </div>
                  <a 
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                  >
                    Visit
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <CardDescription className="mt-2">{source.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {source.variables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs font-normal">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle>Data Access</CardTitle>
          <CardDescription>
            The processed datasets used in this visualization are available for download.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a 
              href="/data/full_panel_data.csv" 
              download
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Full Panel Data</p>
                <p className="text-xs text-muted-foreground">CSV • County-year observations</p>
              </div>
            </a>
            <a 
              href="/data/county_averages.csv" 
              download
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <BarChart className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">County Averages</p>
                <p className="text-xs text-muted-foreground">CSV • Aggregated county data</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Citation */}
      <Card>
        <CardHeader>
          <CardTitle>Citation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <p>
              Naik, R. (2025). NationVitals: Interactive US County Health & Politics Analytics Platform.
              Congressional App Challenge 2025.
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Data sources: CDC WONDER, CDC PLACES, MIT Election Lab, Census ACS, County Health Rankings.
            <br />
            Methodology: Negative binomial GLM with controls for socioeconomic confounders.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
