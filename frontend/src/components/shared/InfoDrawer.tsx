import { useEffect } from 'react';
import { useDrawer } from './DrawerContext';
import { cn } from '@/lib/utils';

export function InfoDrawer() {
  const { isOpen, payload, close } = useDrawer();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  if (!payload) return null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={close}
      />
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col shadow-xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          {payload.mode === 'ai' ? (
            <span className="text-xs font-medium text-[var(--ai)] bg-[var(--ai-soft)] px-2 py-0.5 rounded-full">
              ✦ AI Insight
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--text-muted)]">ⓘ About this chart</span>
          )}
          <button
            onClick={close}
            className="text-[var(--text-subtle)] hover:text-[var(--text)] text-xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-sm font-semibold text-[var(--text)] px-4 py-2.5 border-b border-[var(--border)] shrink-0">
          {payload.title}
        </p>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-sm">
          {payload.mode === 'info' && payload.info && (
            <>
              <DrawerSection label="What is this?" text={payload.info.what} />
              {payload.info.how && <DrawerSection label="How is it calculated?" text={payload.info.how} />}
              {payload.info.source && <DrawerSection label="Data source" text={payload.info.source} />}
              {payload.info.readIt && <DrawerSection label="How to read it" text={payload.info.readIt} />}
            </>
          )}
          {payload.mode === 'ai' && payload.ai && (
            <>
              <DrawerSection label="Observation" text={payload.ai.observation} />
              <DrawerSection label="Insight" text={payload.ai.insight} />
              {payload.ai.metrics && payload.ai.metrics.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                    Key Metrics
                  </p>
                  <div className="space-y-1">
                    {payload.ai.metrics.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-[var(--border)] last:border-0"
                      >
                        <span className="text-[var(--text-muted)]">{m.label}</span>
                        <span className="font-medium text-[var(--text)]">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                  Suggested Actions
                </p>
                <ul className="space-y-2">
                  {payload.ai.actions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-[var(--text-muted)]">
                      <span className="text-[var(--accent)] shrink-0 mt-0.5">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-[var(--text-muted)] leading-relaxed">{text}</p>
    </div>
  );
}
