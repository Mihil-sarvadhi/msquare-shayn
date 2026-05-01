import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

type CustomTooltipProps = Omit<TooltipProps<ValueType, NameType>, 'formatter'> & {
  formatter?: (value: number, name: string) => string;
};

/** Theme-aware Recharts tooltip. Uses the global `--surface` / `--text` /
 *  `--text-muted` / `--border` CSS variables so light theme renders on a
 *  light card and dark theme renders on a dark card automatically — no
 *  per-chart overrides needed. */
export function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      }}
    >
      {label !== undefined && (
        <p className="mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p
          key={i}
          className="leading-snug"
          style={{ color: (entry.color as string) ?? 'var(--text)' }}
        >
          <span style={{ color: 'var(--text-muted)' }}>{entry.name}: </span>
          {formatter
            ? formatter(entry.value as number, entry.name as string)
            : String(entry.value ?? '')}
        </p>
      ))}
    </div>
  );
}
