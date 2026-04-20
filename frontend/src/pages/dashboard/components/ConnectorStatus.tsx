import { useState } from 'react';
import type { ConnectorHealth } from '@app/types/dashboard';

interface ConnectorStatusProps {
  health: ConnectorHealth[];
}

const CONNECTOR_META: Record<string, { label: string; icon: string }> = {
  shopify:    { label: 'Shopify',    icon: '🛍' },
  meta_ads:   { label: 'Meta Ads',   icon: '📣' },
  ithink:     { label: 'iThink',     icon: '🚚' },
  judgeme:    { label: 'Judge.me',   icon: '⭐' },
};

function formatIST(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

const STATUS_STYLES: Record<string, { dot: string; ring: string; label: string }> = {
  green: { dot: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Live'   },
  amber: { dot: 'bg-amber-400',   ring: 'ring-amber-200',   label: 'Delayed' },
  red:   { dot: 'bg-red-500',     ring: 'ring-red-200',     label: 'Down'   },
};

export default function ConnectorStatus({ health }: ConnectorStatusProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {health.map((h) => {
        const key   = h.connector_name.toLowerCase().replace(' ', '_');
        const meta  = CONNECTOR_META[key] ?? { label: h.connector_name, icon: '🔌' };
        const style = STATUS_STYLES[h.status] ?? STATUS_STYLES.red;
        const isHovered = hovered === h.connector_name;

        return (
          <div
            key={h.connector_name}
            onMouseEnter={() => setHovered(h.connector_name)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-200 cursor-default hover:bg-[#F5F0E8]"
          >
            {/* Left — icon + label */}
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">{meta.icon}</span>
              <span className="text-sm font-medium text-[#1A1208]">{meta.label}</span>
            </div>

            {/* Right — status dot + label, time appears on hover */}
            <div className="flex items-center gap-1.5 justify-end">
              {isHovered && h.last_sync_at ? (
                <span className="text-[11px] text-[#8C7B64] tabular-nums">{formatIST(h.last_sync_at)}</span>
              ) : (
                <>
                  <span className={`w-2 h-2 rounded-full ${style.dot} ring-2 ${style.ring}`} />
                  <span className="text-[11px] text-[#8C7B64]">{style.label}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
