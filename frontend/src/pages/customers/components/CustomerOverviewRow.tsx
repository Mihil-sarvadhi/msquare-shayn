import type { CustomerOverview } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';
import { Users, UserPlus, RefreshCw, Repeat2 } from 'lucide-react';
import { KpiCard } from '@components/shared/KpiCard';

interface Props { data: CustomerOverview | null; loading: boolean; }

export function CustomerOverviewRow({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <KpiCard key={i} label="" value="" loading />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard label="Total Customers"     value={formatNum(data.total_customers)}     icon={Users}     />
      <KpiCard label="New Customers"       value={formatNum(data.new_customers)}       icon={UserPlus}  />
      <KpiCard label="Returning Customers" value={formatNum(data.returning_customers)} icon={RefreshCw} />
      <KpiCard label="Repeat Rate"         value={formatPct(data.repeat_rate)}         icon={Repeat2}   />
    </div>
  );
}
