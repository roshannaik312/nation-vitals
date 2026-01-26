import { Activity, BarChart3, Info, Database, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface HeaderProps {
  activeTab: 'map' | 'analysis' | 'about' | 'data';
  onTabChange: (tab: 'map' | 'analysis' | 'about' | 'data') => void;
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

  // Initialize from localStorage on mount
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
    { id: 'map' as const, label: 'Map', icon: Activity },
    { id: 'analysis' as const, label: 'Analysis', icon: BarChart3 },
    { id: 'about' as const, label: 'About', icon: Info },
    { id: 'data' as const, label: 'Data Sources', icon: Database },
  ];

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full max-w-[1800px] mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              NationVitals
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className="gap-1 sm:gap-2 shrink-0"
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
