import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CustomerOverview } from '@app/types/analytics';
import { formatNum } from '@utils/formatters';

interface Props { data: CustomerOverview | null; loading: boolean; }

export function NewVsReturning({ data, loading }: Props) {
  if (loading || !data) return <div className="h-56 bg-parch animate-pulse rounded-lg" />;

  const pieData = [
    { name: 'New',       value: Number(data.new_customers),       color: '#2D7D46' },
    { name: 'Returning', value: Number(data.returning_customers), color: '#B8860B' },
  ].filter((d) => d.value > 0);

  if (!pieData.length) return <p className="text-muted text-sm text-center py-12">No customer data</p>;

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData} cx="50%" cy="50%"
            innerRadius={58} outerRadius={82}
            dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}
          >
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [`${formatNum(v)} (${Math.round((v / total) * 100)}%)`, name]}
            contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
            position={{ y: -40 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-2 -mt-2">
        <div className="text-center px-4 border-r border-parch">
          <p className="text-lg font-bold text-ink leading-none">{formatNum(total)}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-0.5">Total</p>
        </div>
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 px-4 border-r border-parch last:border-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <div>
              <p className="text-xs font-semibold text-ink leading-none">{formatNum(d.value)} <span className="font-normal text-muted">({Math.round((d.value / total) * 100)}%)</span></p>
              <p className="text-[10px] text-muted mt-0.5">{d.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
