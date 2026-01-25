import { ExternalLink } from 'lucide-react';

export function Footer() {
  const dataSources = [
    { name: 'CDC WONDER', url: 'https://wonder.cdc.gov/' },
    { name: 'CDC PLACES', url: 'https://www.cdc.gov/places/' },
    { name: 'MIT Election Lab', url: 'https://electionlab.mit.edu/' },
    { name: 'Census ACS', url: 'https://www.census.gov/programs-surveys/acs' },
  ];

  return (
    <footer className="border-t border-border bg-muted/30 py-6">
      <div className="max-w-[1800px] mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">NationVitals</span>
              {' '}— Built for the Congressional App Challenge 2025
            </p>
            <p className="mt-1">
              Methodology: Negative binomial mixed-effects models controlling for socioeconomic confounders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground">Data Sources:</span>
            {dataSources.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {source.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
