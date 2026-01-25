import { BarChart3, GitCompare, Info, Database, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface HeaderProps {
  activeTab: 'map' | 'compare' | 'analysis' | 'about' | 'data';
  onTabChange: (tab: 'map' | 'compare' | 'analysis' | 'about' | 'data') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
    } else if (saved === 'light') {
      setIsDark(false);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  const tabs = [
    { id: 'map' as const, label: 'Map', icon: BarChart3 },
    { id: 'compare' as const, label: 'Compare', icon: GitCompare },
    { id: 'analysis' as const, label: 'Analysis', icon: BarChart3 },
    { id: 'about' as const, label: 'About', icon: Info },
    { id: 'data' as const, label: 'Data Sources', icon: Database },
  ];

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full max-w-[1800px] mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/nationvitals_logo.png"
            alt="NationVitals"
            className="w-8 h-8 rounded-lg"
          />
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            County Intelligence for the Fentanyl Crisis
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            );
          })}

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDark(!isDark)}
            className="ml-2"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
