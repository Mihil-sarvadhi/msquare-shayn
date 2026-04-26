import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { GeoRevenueItem } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: GeoRevenueItem[]; loading: boolean; }

export function GeoRevenue({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No order data</p>;

  const chartData = data.map((d) => ({ state: d.state, revenue: parseFloat(String(d.revenue)) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 44 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis
          dataKey="state"
          tick={{ fontSize: 10, fill: '#8C7B64' }}
          axisLine={false} tickLine={false}
          angle={-35} textAnchor="end" interval={0}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: '#8C7B64' }}
          axisLine={false} tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(val: number) => [formatINR(val), 'Revenue']}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
        />
        <Bar dataKey="revenue" fill="#B8860B" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
