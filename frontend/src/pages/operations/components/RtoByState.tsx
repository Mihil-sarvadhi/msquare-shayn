import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { RtoByStateItem } from '@app/types/analytics';

interface Props { data: RtoByStateItem[]; loading: boolean; }

function rtoColor(rate: number) {
  if (rate > 20) return '#9B2235';
  if (rate > 10) return '#B45309';
  return '#2D7D46';
}

export function RtoByState({ data, loading }: Props) {
  if (loading) return <div className="h-64 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No shipment data</p>;

  const chartData = data.map((d) => ({
    state: d.state,
    rto_count: Number(d.rto_count),
    rto_rate: Number(d.rto_rate),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="state" type="category" width={90} tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(val: number) => [val, 'RTO Orders']}
            contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
          />
          <Bar dataKey="rto_count" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={rtoColor(entry.rto_rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#9B2235] inline-block" />&gt;20% rate</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#B45309] inline-block" />10–20%</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2D7D46] inline-block" />&lt;10%</span>
      </div>
    </div>
  );
}
