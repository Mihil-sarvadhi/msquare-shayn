import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { MarketingTrendItem } from '@app/types/analytics';
import { formatDate } from '@utils/formatters';

interface Props { data: MarketingTrendItem[]; loading: boolean; }

export function RoasTrend({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No ad data</p>;

  const chartData = data.map((d) => ({
    ts:   new Date(d.date).getTime(),
    roas: parseFloat(String(d.roas)),
  }));
  const ticks = chartData.map((d) => d.ts);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis
          dataKey="ts" type="number" scale="time"
          domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false}
          width={36} tickFormatter={(v: number) => `${v}x`}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(2)}x`, 'ROAS']}
          labelFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
        />
        <ReferenceLine y={1} stroke="#9B2235" strokeDasharray="4 4"
          label={{ value: 'Break-even', position: 'right', fontSize: 10, fill: '#9B2235' }} />
        <ReferenceLine y={2} stroke="#2D7D46" strokeDasharray="4 4"
          label={{ value: 'Target 2x', position: 'right', fontSize: 10, fill: '#2D7D46' }} />
        <Line type="monotone" dataKey="roas" stroke="#B8860B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
