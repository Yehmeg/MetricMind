'use client';

import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Sun, Moon, Bell, User, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center gap-4 px-4 md:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" aria-label="3 unread notifications" />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="User menu"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <User className="h-5 w-5" aria-hidden="true" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-dropdown focus-ring animate-fade-in">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground">Analyst User</p>
                <p className="text-xs text-muted-foreground">analyst@metricmind.io</p>
              </div>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <HelpCircle className="h-4 w-4" />
                Help & Docs
              </button>
              <hr className="my-1 border-border" />
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent hover:text-destructive transition-colors">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import { Settings, HelpCircle, LogOut } from 'lucide-react';