import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#FDFAF4] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={
            <div className="flex h-screen items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
}
