import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChannelRevenue as ChannelRevenueType } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface ChannelRevenueProps {
  data: ChannelRevenueType | null;
  loading: boolean;
}

const COLORS = ['#B8860B', '#2D7D46', '#6366F1'];

export function ChannelRevenue({ data, loading }: ChannelRevenueProps) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data || data.shopify_revenue === 0) {
    return <p className="text-muted text-sm text-center py-8">No revenue data</p>;
  }

  const total = data.shopify_revenue;
  const chartData = [
    {
      name: 'Meta Ads',
      value: data.meta_revenue,
      pct: total > 0 ? Math.round((data.meta_revenue / total) * 100) : 0,
    },
    {
      name: 'Organic / Direct',
      value: data.organic_revenue,
      pct: total > 0 ? Math.round((data.organic_revenue / total) * 100) : 0,
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-parch">
        <span className="text-xs text-muted uppercase tracking-wide">Total D2C Revenue</span>
        <span className="font-bold text-gold">{formatINR(total)}</span>
      </div>

      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={52}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((_entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatINR(v)} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-xs text-muted">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-ink">{formatINR(item.value)}</span>
                <span className="text-xs text-muted ml-1.5">({item.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
