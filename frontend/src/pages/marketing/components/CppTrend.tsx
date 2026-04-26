import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { MarketingTrendItem } from '@app/types/analytics';
import { formatINR, formatDate } from '@utils/formatters';

interface Props { data: MarketingTrendItem[]; loading: boolean; }

export function CppTrend({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data
    .filter((d) => Number(d.purchases) > 0)
    .map((d) => ({
      ts:  new Date(d.date).getTime(),
      cpp: parseFloat(String(d.cpp)),
    }));
  const ticks = chartData.map((d) => d.ts);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis
          dataKey="ts" type="number" scale="time"
          domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false}
          width={60}
        />
        <Tooltip
          formatter={(v: number) => [formatINR(v), 'Cost Per Purchase']}
          labelFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
        />
        <Line type="monotone" dataKey="cpp" stroke="#9B2235" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
