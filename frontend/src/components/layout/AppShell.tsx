import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#FDFAF4] overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        <MobileHeader />

        <main className="flex-1 overflow-auto pt-[52px] md:pt-0">
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
