import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Info } from 'lucide-react';
import { KPIs } from '@app/types/dashboard';
import { formatNum } from '@utils/formatters';

interface Props { kpis: KPIs | null; loading: boolean; }

/* COD = c5 amber, Prepaid = c2 teal (matches mockup donut) */
const COLORS = ['#C8780B', '#0F8C82'];
const TRACK  = 'var(--bg-2)';

export default function CODSplit({ kpis, loading }: Props) {
  if (loading) return <div className="h-40 bg-parch animate-pulse rounded-lg" />;
  if (!kpis) return null;

  const items = [
    { name: 'COD',     value: kpis.codOrders     },
    { name: 'Prepaid', value: kpis.prepaidOrders  },
  ].filter((d) => d.value > 0);

  const total = items.reduce((s, d) => s + d.value, 0);

  const gaugeData = [...items, { name: '__gap', value: total }];

  return (
    <div className="space-y-2">
    <div className="flex items-center gap-4">
      {/* Semi-circle gauge */}
      <div className="relative shrink-0" style={{ width: 130, height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Track */}
            <Pie data={[{ value: 1 }]} cx="50%" cy="90%" startAngle={180} endAngle={0}
              innerRadius={40} outerRadius={58} dataKey="value" strokeWidth={0}>
              <Cell fill={TRACK} />
            </Pie>
            {/* Gauge */}
            <Pie data={gaugeData} cx="50%" cy="90%" startAngle={180} endAngle={0}
              innerRadius={40} outerRadius={58} dataKey="value" paddingAngle={2} strokeWidth={0}>
              {gaugeData.map((d, i) =>
                d.name === '__gap'
                  ? <Cell key={i} fill="transparent" />
                  : <Cell key={i} fill={COLORS[i % COLORS.length]} />
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-1">
          <p className="text-2xl font-bold text-ink leading-none">{formatNum(total)}</p>
          <p className="text-[10px] text-muted">Orders</p>
        </div>
      </div>

      {/* Stat rows */}
      <div className="flex-1 space-y-2">
        {items.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name}>
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-parch">
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-muted flex-1">{d.name}</span>
                <span className="text-sm font-bold text-ink">{formatNum(d.value)}</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: COLORS[i] + '22', color: COLORS[i] }}>{pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-parch mt-1 overflow-hidden">
                <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
    {/* Source note — COD/Prepaid counts come from iThink shipments, not Shopify */}
    <div className="flex items-start gap-1.5 px-1">
      <Info size={11} strokeWidth={1.5} className="text-[var(--muted)] shrink-0 mt-0.5" />
      <p className="text-[10px] text-[#8C7B64] leading-snug">
        Count reflects iThink shipments with a recorded payment mode. Orders not yet shipped or missing payment info are excluded.
      </p>
    </div>
    </div>
  );
}
