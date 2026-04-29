import type { NetRevenue } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';
import { IndianRupee, Truck, TrendingUp, PackageX } from 'lucide-react';
import { KpiCard } from '@components/shared/KpiCard';

interface Props { data: NetRevenue | null; loading: boolean; }

export function NetRevenueRow({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <KpiCard key={i} label="" value="" loading />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard label="Gross Revenue"  value={formatINR(data.gross_revenue)}  icon={IndianRupee} />
      <KpiCard label="Logistics Cost" value={formatINR(data.logistics_cost)} icon={Truck}       />
      <KpiCard label="Net Revenue"    value={formatINR(data.net_revenue)}    icon={TrendingUp}  />
      <KpiCard label="RTO Waste"      value={formatINR(data.rto_waste)}      icon={PackageX}    />
    </div>
  );
}
