import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FDFAF4]">
      <div className="sticky top-0 z-50">
        <TopNav />
      </div>
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Loading…
          </div>
        }>
          {children}
        </Suspense>
      </main>
      <footer className="border-t border-[#F0EBE0] py-3 text-center">
        <p className="text-xs text-[#8C7B64]">
          © {new Date().getFullYear()}, SHAYN All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
