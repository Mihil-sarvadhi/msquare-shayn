import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CustomerOverview } from '@app/types/analytics';
import { formatNum } from '@utils/formatters';

interface Props { data: CustomerOverview | null; loading: boolean; }

export function NewVsReturning({ data, loading }: Props) {
  if (loading || !data) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;

  const pieData = [
    { name: 'New',       value: data.new_customers,       color: '#2D7D46' },
    { name: 'Returning', value: data.returning_customers, color: '#B8860B' },
  ].filter((d) => d.value > 0);

  if (!pieData.length) return <p className="text-muted text-sm text-center py-12">No customer data</p>;

  return (
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
          formatter={(v: number) => formatNum(v)}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
