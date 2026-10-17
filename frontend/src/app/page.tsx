'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { ConversationArea } from '@/components/conversation';
import { api } from '@/lib/api';
import type { HealthResponse, MetricsCatalogResponse } from '@/types/api';
import { Database, Wifi, WifiOff, Github } from 'lucide-react';

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [catalog, setCatalog] = useState<MetricsCatalogResponse | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const [healthRes, catalogRes] = await Promise.all([
          api.health(),
          api.metrics(),
        ]);
        setHealth(healthRes);
        setCatalog(catalogRes);
        setBackendStatus('connected');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('error');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      <ConversationArea />
      
      {/* Status Bar */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs p-4">
          <div className="flex items-center gap-2">
            <span className={`
              w-2 h-2 rounded-full
              ${backendStatus === 'connected' ? 'bg-green-500' : backendStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}
            `} />
            <span className="text-muted-foreground">
              {backendStatus === 'connected' ? 'Backend connected' : backendStatus === 'checking' ? 'Connecting...' : 'Backend disconnected'}
            </span>
            {health && (
              <>
                <span className="text-border">|</span>
                <span className="text-muted-foreground">Mode: {health.mode}</span>
                <span className="text-border">|</span>
                <span className="text-muted-foreground">Contract: {health.contract_version}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>MetricMind v0.1</span>
            <a href="https://github.com/Yehmeg/MetricMind" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </DashboardLayout>
  );
}