import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#FDFAF4]">
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
}
