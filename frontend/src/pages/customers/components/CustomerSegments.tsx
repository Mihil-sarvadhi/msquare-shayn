import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { CustomerSegmentItem } from '@app/types/analytics';
import { formatNum } from '@utils/formatters';

interface Props { data: CustomerSegmentItem[]; loading: boolean; }

export function CustomerSegments({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data.map((d) => ({ bucket: d.bucket, count: Number(d.count) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => [formatNum(v), 'Customers']}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#B8860B" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
