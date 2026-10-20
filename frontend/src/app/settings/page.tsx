'use client';

import { DashboardLayout } from '@/components/layout';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Interface preferences</p>
        </div>

        <section className="p-4 rounded-xl border border-border bg-card space-y-3">
          <h2 className="text-sm font-medium text-foreground">Appearance</h2>
          <div className="flex gap-3">
            {(['light', 'dark'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                aria-pressed={theme === option}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  theme === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {option === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {option}
              </button>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
