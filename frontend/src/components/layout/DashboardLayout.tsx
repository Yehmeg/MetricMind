'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          'lg:ml-64'
        )}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/50"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}