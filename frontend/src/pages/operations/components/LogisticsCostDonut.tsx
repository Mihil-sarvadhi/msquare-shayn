import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { LogisticsCosts } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: LogisticsCosts | null; loading: boolean; }

const SEGMENTS = [
  { key: 'fwd', label: 'Forward', color: '#B8860B' },
  { key: 'rto', label: 'RTO',     color: '#9B2235' },
  { key: 'cod', label: 'COD',     color: '#B45309' },
  { key: 'gst', label: 'GST',     color: '#8C7B64' },
] as const;

export function LogisticsCostDonut({ data, loading }: Props) {
  if (loading || !data) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;

  const pieData = SEGMENTS.map((s) => ({
    name: s.label,
    value: parseFloat(String(data[s.key] ?? 0)),
    color: s.color,
  })).filter((d) => d.value > 0);

  if (!pieData.length) return <p className="text-muted text-sm text-center py-12">No cost data</p>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData} cx="50%" cy="50%"
            innerRadius={52} outerRadius={78}
            dataKey="value" paddingAngle={3}
          >
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            formatter={(val: number) => formatINR(val)}
            contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-muted mt-1">
        Total: <span className="font-semibold text-ink">{formatINR(data.total)}</span>
      </p>
    </div>
  );
}
