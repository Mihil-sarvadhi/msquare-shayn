import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-[#FDFAF4] overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading…
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
