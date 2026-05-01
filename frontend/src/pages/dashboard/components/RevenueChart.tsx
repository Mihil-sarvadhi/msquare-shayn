import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { RevenueTrendItem } from '@app/types/dashboard';
import { formatINR, formatDate } from '@utils/formatters';
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from '@utils/constants/palette';

interface RevenueChartProps {
  data: RevenueTrendItem[];
  loading: boolean;
}

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data
    .map(d => ({ ...d, revenue: parseFloat(String(d.revenue)) || 0 }))
    .filter(d => d.revenue > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, ts: new Date(d.date).getTime() }));

  const tickTs = chartData.map(d => d.ts);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={tickTs}
          tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 10, fill: 'var(--muted-2)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 10, fill: 'var(--muted-2)' }}
          axisLine={false}
          tickLine={false}
          width={60}
          domain={[0, 'auto']}
        />
        <Tooltip
          formatter={(val: number) => [formatINR(val), 'Revenue']}
          labelFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
