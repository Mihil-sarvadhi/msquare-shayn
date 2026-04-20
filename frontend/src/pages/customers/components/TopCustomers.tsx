import type { TopCustomerItem } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: TopCustomerItem[]; loading: boolean; }

function maskEmail(email: string): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.length > 3 ? `${local.slice(0, 3)}***@${domain}` : `***@${domain}`;
}

export function TopCustomers({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-8">No customer data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-parch">
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4 w-8">#</th>
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4">Customer</th>
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4">Location</th>
            <th className="text-right text-xs font-medium text-muted pb-2 pr-4">Orders</th>
            <th className="text-right text-xs font-medium text-muted pb-2">Total Spent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={c.customer_id} className="border-b border-parch/50 hover:bg-[#FDFAF4] transition-colors">
              <td className="py-2.5 pr-4 text-muted font-medium">{i + 1}</td>
              <td className="py-2.5 pr-4">
                {c.name && (
                  <p className="text-ink font-medium text-xs leading-tight">{c.name}</p>
                )}
                <p className="text-muted text-xs">{maskEmail(c.email)}</p>
              </td>
              <td className="py-2.5 pr-4 text-muted text-xs">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
              <td className="py-2.5 pr-4 text-right text-ink">{c.orders_count}</td>
              <td className="py-2.5 text-right font-semibold text-ink">{formatINR(c.total_spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
