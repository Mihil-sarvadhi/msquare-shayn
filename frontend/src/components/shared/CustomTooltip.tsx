import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

type CustomTooltipProps = Omit<TooltipProps<ValueType, NameType>, 'formatter'> & {
  formatter?: (value: number, name: string) => string;
};

export function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1814] text-white rounded-lg px-3 py-2 text-xs shadow-lg border border-white/10">
      {label !== undefined && <p className="text-[#a39f92] mb-1.5 font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: (entry.color as string) ?? '#fff' }} className="leading-snug">
          <span className="text-white/60">{entry.name}: </span>
          {formatter
            ? formatter(entry.value as number, entry.name as string)
            : String(entry.value ?? '')}
        </p>
      ))}
    </div>
  );
}
