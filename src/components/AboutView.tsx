import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Github, Mail, Target, Users, BarChart3, Shield } from 'lucide-react';

export function AboutView() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-4">NationVitals</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tracking America's Health Crisis, County by County
        </p>
        <p className="text-muted-foreground mt-4">
          An interactive platform exploring drug overdoses, mental health—and how they 
          connect to politics, poverty, and community factors.
        </p>
        <Badge variant="outline" className="mt-4">
          Congressional App Challenge 2025
        </Badge>
      </div>

      {/* Mission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Our Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            <strong>NationVitals</strong> aims to combat misinformation by providing transparent, 
            data-driven insights into America's public health challenges. We believe that understanding 
            the complex relationships between socioeconomic factors, political environments, and health 
            outcomes is essential for effective policy-making.
          </p>
          <p>
            Our platform empowers citizens, policymakers, researchers, and journalists with accessible, 
            interactive tools to explore county-level health data and draw their own informed conclusions.
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Interactive Exploration
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• County-level choropleth maps with multiple health metrics</li>
              <li>• Time slider to view trends from 2018-2023</li>
              <li>• Side-by-side county comparisons with detailed charts</li>
              <li>• Hover tooltips with quick statistics</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rigorous Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• Statistical models controlling for confounders</li>
              <li>• Negative binomial GLMMs for count data</li>
              <li>• Transparent methodology documentation</li>
              <li>• Clear limitations and caveats</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* About Creator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            About the Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            <strong>Roshan Naik</strong> - Creator and Developer
          </p>
          <p>
            This project was created as a submission for the Congressional App Challenge 2025, 
            with the goal of making public health data more accessible and understandable to everyone.
          </p>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">React</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="secondary">Mapbox GL</Badge>
            <Badge variant="secondary">Recharts</Badge>
            <Badge variant="secondary">Tailwind CSS</Badge>
            <Badge variant="secondary">shadcn/ui</Badge>
            <Badge variant="secondary">Vite</Badge>
            <Badge variant="secondary">Python</Badge>
            <Badge variant="secondary">Wolfram Language</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Data processing performed with Python (pandas, statsmodels) and Wolfram Language for 
            geospatial analytics.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Links & Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Github className="w-4 h-4" />
              View on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="mailto:contact@example.com"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              Contact
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
