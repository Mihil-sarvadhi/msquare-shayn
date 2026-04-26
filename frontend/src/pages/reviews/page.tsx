import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { Panel } from '@components/shared/Panel';
import { KpiCard } from '@components/shared/KpiCard';
import { CustomTooltip } from '@components/shared/CustomTooltip';
import { PageLoader } from '@components/shared/PageLoader';
import { formatNum, formatPct, formatDate } from '@utils/formatters';
import {
  AreaChart, Area, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ReviewsSummary, TopRatedProduct, RecentReview, ReviewsTrendItem } from '@app/types/dashboard';

const ACCENT = '#8b6f3a';
const POS    = '#2d7a5f';
const NEG    = '#b8433a';
const WARN   = '#c4871f';
const AI     = '#5b4299';
const MUTED  = '#a39f92';

function RatingTrendChart({ data }: { data: ReviewsTrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={WARN} stopOpacity={0.15} />
            <stop offset="95%" stopColor={WARN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} />
        <YAxis domain={[0, 5]} tickFormatter={(v: number) => `${v}★`} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={(v, n) => n === 'avg_rating' ? `${Number(v).toFixed(2)}★` : formatNum(v)} />} />
        <Area type="monotone" dataKey="avg_rating" stroke={WARN} strokeWidth={2} fill="url(#ratingGrad)" name="Avg Rating" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AvgRatingTrendChart({ data }: { data: ReviewsTrendItem[] }) {
  if (!data.length) return <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} />
        <YAxis yAxisId="rating" domain={[3.5, 5]} tickFormatter={(v: number) => `${v}★`} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
        <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<CustomTooltip formatter={(v, n) => n === 'Avg Rating' ? `${Number(v).toFixed(2)}★` : formatNum(v)} />} />
        <ReferenceLine yAxisId="rating" y={4.5} stroke={WARN} strokeDasharray="4 3" strokeWidth={1.5} label={{ value: '4.5★', position: 'insideTopRight', fontSize: 10, fill: WARN }} />
        <Bar yAxisId="count" dataKey="review_count" name="Reviews" fill={AI} fillOpacity={0.25} radius={[2, 2, 0, 0]} />
        <Line yAxisId="rating" type="monotone" dataKey="avg_rating" name="Avg Rating" stroke={WARN} strokeWidth={2} dot={{ r: 2, fill: WARN }} activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function UgcTrendChart({ data }: { data: ReviewsTrendItem[] }) {
  const enriched = data.map((d) => ({
    ...d,
    without_photos: d.review_count - (d.review_count * 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={enriched} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ugcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={AI} stopOpacity={0.15} />
            <stop offset="95%" stopColor={AI} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={(v) => formatNum(v)} />} />
        <Area type="monotone" dataKey="review_count" stroke={AI} strokeWidth={2} fill="url(#ugcGrad)" name="Reviews" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// function RatingDistributionBar({ data }: { data: ReviewsSummary | null }) {
//   if (!data) return <div className="h-44 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>;
//   const bars = [
//     { name: '5★', value: data.five_star, fill: POS },
//     { name: '4★', value: data.four_star, fill: ACCENT },
//     { name: '3★', value: data.three_star, fill: WARN },
//     { name: '2★', value: data.two_star, fill: NEG },
//     { name: '1★', value: data.one_star, fill: '#8b2020' },
//   ];
//   return (
//     <ResponsiveContainer width="100%" height={180}>
//       <BarChart data={bars} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
//         <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
//         <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} />
//         <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
//         <Tooltip content={<CustomTooltip formatter={(v) => formatNum(v)} />} />
//         <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
//           {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// }

function RatingSummaryCard({ data, trend }: { data: ReviewsSummary | null; trend: ReviewsTrendItem[] }) {
  if (!data) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No data</div>;

  const total = data.total_reviews || 1;
  const positivePct = Math.round(((data.five_star + data.four_star) / total) * 100);
  const negativePct = Math.round(((data.two_star + data.one_star) / total) * 100);
  const photoPct    = Math.round((data.with_photos / total) * 100);

  // Period trend: compare second half vs first half of trend window
  const mid        = Math.floor(trend.length / 2);
  const half1      = trend.slice(0, mid).filter((d) => d.avg_rating > 0);
  const half2      = trend.slice(mid).filter((d) => d.avg_rating > 0);
  const avg1       = half1.length ? half1.reduce((s, d) => s + d.avg_rating, 0) / half1.length : 0;
  const avg2       = half2.length ? half2.reduce((s, d) => s + d.avg_rating, 0) / half2.length : 0;
  const trendDelta = avg1 > 0 && avg2 > 0 ? avg2 - avg1 : null;

  const bars = [
    { label: '5★', count: data.five_star,  fill: POS },
    { label: '4★', count: data.four_star,  fill: ACCENT },
    { label: '3★', count: data.three_star, fill: WARN },
    { label: '2★', count: data.two_star,   fill: NEG },
    { label: '1★', count: data.one_star,   fill: '#8b2020' },
  ];

  const pieData = bars.map((b) => ({ name: b.label, value: b.count || 0.01, fill: b.fill }));

  const insight =
    negativePct === 0            ? 'No negative reviews in this period' :
    data.five_star / total >= 0.7 ? `${Math.round((data.five_star / total) * 100)}% of reviews are 5★` :
    positivePct >= 90            ? `${positivePct}% of reviews are 4★ or above` :
    negativePct >= 20            ? `${negativePct}% critical reviews need attention` :
                                   `${positivePct}% positive · ${negativePct}% negative`;

  return (
    <div className="flex gap-5 items-start">

      {/* Left — donut + score */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="relative w-[96px] h-[96px]">
          <PieChart width={96} height={96}>
            <Pie data={pieData} cx={48} cy={48} innerRadius={30} outerRadius={44} dataKey="value" paddingAngle={1} startAngle={90} endAngle={-270}>
              {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm font-bold" style={{ color: WARN }}>{Number(data.store_rating).toFixed(1)}</span>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-subtle)] text-center leading-tight">
          {formatNum(data.total_reviews)} reviews
        </p>
        {trendDelta !== null && (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: trendDelta >= 0 ? POS : NEG,
              background: trendDelta >= 0 ? '#f0faf5' : '#fdf2f2',
            }}
          >
            {trendDelta >= 0 ? '↑' : '↓'} {Math.abs(trendDelta).toFixed(2)} trend
          </span>
        )}
      </div>

      {/* Right — breakdown + metrics + insight */}
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">

        {/* Progress bars */}
        <div className="space-y-1.5">
          {bars.map((b) => {
            const pct = (b.count / total) * 100;
            return (
              <div key={b.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-subtle)] w-5 shrink-0 font-medium">{b.label}</span>
                <div className="flex-1 h-2 bg-[#f0ece4] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: b.fill }} />
                </div>
                <span className="text-[11px] text-[var(--text-muted)] w-5 text-right shrink-0">{b.count}</span>
                <span className="text-[10px] text-[var(--text-subtle)] w-7 text-right shrink-0">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>

        {/* Key metrics strip */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5 border-t border-[var(--border)]">
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: POS }}>{positivePct}%</p>
            <p className="text-[10px] text-[var(--text-subtle)] leading-tight">Positive<br/>4–5★</p>
          </div>
          <div className="text-center border-x border-[var(--border)]">
            <p className="text-sm font-bold" style={{ color: negativePct > 0 ? NEG : MUTED }}>{negativePct}%</p>
            <p className="text-[10px] text-[var(--text-subtle)] leading-tight">Negative<br/>1–2★</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-[var(--text-muted)]">{photoPct}%</p>
            <p className="text-[10px] text-[var(--text-subtle)] leading-tight">With<br/>photos</p>
          </div>
        </div>

        {/* Insight chip */}
        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
          <span className="text-amber-500 text-xs shrink-0 mt-px">💡</span>
          <p className="text-[11px] text-amber-800 font-medium leading-snug">{insight}</p>
        </div>

      </div>
    </div>
  );
}

type TopBottomView = 'both' | 'top' | 'bottom';

function TopBottomRatedChart({ data }: { data: TopRatedProduct[] }) {
  const [view, setView] = useState<TopBottomView>('both');

  if (!data.length) return (
    <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No product data</div>
  );

  // Backend already returns ORDER BY rating DESC; take top 5 and bottom 5 without overlap
  const sorted   = [...data].sort((a, b) => b.average_rating - a.average_rating);
  const top5     = sorted.slice(0, Math.min(5, sorted.length));
  const top5Ids  = new Set(top5.map((p) => p.product_id));
  const bottom5  = sorted.filter((p) => !top5Ids.has(p.product_id)).slice(-5).reverse();

  const showTop    = view !== 'bottom';
  const showBottom = view !== 'top';

  const views: { v: TopBottomView; label: string }[] = [
    { v: 'both',   label: 'Both' },
    { v: 'top',    label: '↑ Top' },
    { v: 'bottom', label: '↓ Bottom' },
  ];

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1.5">
          {views.map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                view === v
                  ? 'bg-[var(--ai)] text-white border-[var(--ai)]'
                  : 'text-[var(--text-subtle)] border-[var(--border)] hover:border-[var(--ai)] hover:text-[var(--ai)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--text-subtle)]">Scale 0–5★</span>
      </div>

      {/* Top Rated */}
      {showTop && top5.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: POS }}>▲ Top Rated</p>
          <div className="space-y-2">
            {top5.map((p) => {
              const pct = (p.average_rating / 5) * 100;
              return (
                <div key={p.product_id} className="flex items-center gap-2">
                  <span title={p.title} className="text-[11px] text-[var(--text-muted)] w-[108px] shrink-0 truncate text-right leading-tight">
                    {p.title}
                  </span>
                  <div className="flex-1 h-[14px] bg-[#f0ece4] rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: POS, opacity: 0.85 }} />
                  </div>
                  <span className="text-[11px] font-semibold w-10 shrink-0" style={{ color: POS }}>
                    {p.average_rating.toFixed(1)}★
                  </span>
                  <span className="text-[10px] text-[var(--text-subtle)] w-7 shrink-0 text-right">
                    ({p.reviews_count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {showTop && showBottom && bottom5.length > 0 && (
        <div className="border-t border-dashed border-[var(--border)] my-3" />
      )}

      {/* Bottom Rated */}
      {showBottom && bottom5.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: NEG }}>▼ Bottom Rated</p>
          <div className="space-y-2">
            {bottom5.map((p) => {
              const pct = (p.average_rating / 5) * 100;
              return (
                <div key={p.product_id} className="flex items-center gap-2">
                  <span title={p.title} className="text-[11px] text-[var(--text-muted)] w-[108px] shrink-0 truncate text-right leading-tight">
                    {p.title}
                  </span>
                  <div className="flex-1 h-[14px] bg-[#f0ece4] rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: NEG, opacity: 0.85 }} />
                  </div>
                  <span className="text-[11px] font-semibold w-10 shrink-0" style={{ color: NEG }}>
                    {p.average_rating.toFixed(1)}★
                  </span>
                  <span className="text-[10px] text-[var(--text-subtle)] w-7 shrink-0 text-right">
                    ({p.reviews_count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showBottom && bottom5.length === 0 && showBottom && (
        <div className="flex items-center justify-center py-4 text-[11px] text-[var(--text-subtle)]">
          Not enough products for bottom section
        </div>
      )}

      {/* Scale ticks */}
      <div className="flex mt-3 ml-[116px] mr-[68px]">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`flex-1 text-[10px] text-[var(--text-subtle)] ${n === 0 ? 'text-left' : n === 5 ? 'text-right' : 'text-center'}`}>
            {n}★
          </span>
        ))}
      </div>
    </div>
  );
}

type ReviewFilter = 'all' | 'critical' | 'media' | 1 | 2 | 3 | 4 | 5;
type ReviewSort = 'latest' | 'highest' | 'lowest';

function starColor(rating: number): string {
  if (rating >= 5) return POS;
  if (rating >= 4) return ACCENT;
  if (rating >= 3) return WARN;
  return NEG;
}

function parseUrls(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((u) => u.trim()).filter(Boolean);
}

function StarRating({ rating }: { rating: number }) {
  const color = starColor(rating);
  return (
    <span style={{ color }} className="text-sm font-bold tracking-wide select-none">
      {'★'.repeat(rating)}
      <span className="opacity-25">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function ReviewCard({ review, onImageClick }: { review: RecentReview; onImageClick: (url: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const urls = parseUrls(review.picture_urls);
  const isLong = (review.body?.length ?? 0) > 140;

  return (
    <div className="border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--border-hover,#d4cfc6)] transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <StarRating rating={review.rating} />
          {review.rating <= 2 && (
            <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Critical</span>
          )}
          {review.has_photos && (
            <span className="text-[10px] font-medium bg-[var(--ai-soft)] text-[var(--ai)] px-1.5 py-0.5 rounded-full">📷 Media</span>
          )}
          {review.verified && (
            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">✓ Verified</span>
          )}
        </div>
        <span className="text-[11px] text-[var(--text-subtle)] shrink-0 pt-0.5">{formatDate(review.created_at)}</span>
      </div>

      {/* Title */}
      {review.title && (
        <p className="text-sm font-semibold text-[var(--text)] mb-1 leading-snug">{review.title}</p>
      )}

      {/* Body */}
      {review.body && (
        <div className="mb-2">
          <p className={`text-xs text-[var(--text-muted)] leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {review.body}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] text-[var(--ai)] font-medium mt-0.5 hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Image thumbnails */}
      {urls.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {urls.map((url) => (
            <button
              key={url}
              onClick={() => onImageClick(url)}
              className="w-14 h-14 rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--ai)] transition-colors shrink-0"
            >
              <img src={url} alt="Review" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-subtle)] font-medium truncate">
          {review.reviewer_name ?? 'Anonymous'}
        </span>
        {review.product_title && (
          <span className="text-[11px] text-[var(--text-subtle)] truncate max-w-[180px] text-right opacity-70">
            {review.product_title}
          </span>
        )}
      </div>
    </div>
  );
}

function RecentReviewsCards({ data }: { data: RecentReview[] }) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [sortBy, setSortBy] = useState<ReviewSort>('latest');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const filtered = data.filter((r) => {
    if (filter === 'critical') return r.rating <= 2;
    if (filter === 'media') return r.has_photos;
    if (typeof filter === 'number') return r.rating === filter;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const chips: { label: string; value: ReviewFilter }[] = [
    { label: 'All', value: 'all' },
    { label: '⚠ Critical ≤2★', value: 'critical' },
    { label: '📷 With Media', value: 'media' },
    { label: '5★', value: 5 },
    { label: '4★', value: 4 },
    { label: '3★', value: 3 },
    { label: '2★', value: 2 },
    { label: '1★', value: 1 },
  ];

  return (
    <div>
      {/* Filter + Sort bar */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {chips.map((c) => (
            <button
              key={String(c.value)}
              onClick={() => setFilter(c.value)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                filter === c.value
                  ? 'bg-[var(--ai)] text-white border-[var(--ai)]'
                  : 'bg-white text-[var(--text-subtle)] border-[var(--border)] hover:border-[var(--ai)] hover:text-[var(--ai)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as ReviewSort)}
          className="text-xs border border-[var(--border)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai)] cursor-pointer"
        >
          <option value="latest">Latest first</option>
          <option value="highest">Highest rating</option>
          <option value="lowest">Lowest rating</option>
        </select>
      </div>

      {/* Count label */}
      <p className="text-[11px] text-[var(--text-subtle)] mb-2">
        {sorted.length} review{sorted.length !== 1 ? 's' : ''}{filter !== 'all' ? ' matching filter' : ''}
      </p>

      {/* Scrollable list */}
      <div className="max-h-[600px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-2">🔍</span>
            <p className="text-sm font-medium text-[var(--text-muted)]">No reviews match this filter</p>
            <p className="text-xs text-[var(--text-subtle)] mt-0.5">Try selecting a different filter above</p>
          </div>
        ) : (
          sorted.map((r) => (
            <ReviewCard key={r.review_id} review={r} onImageClick={setLightboxUrl} />
          ))
        )}
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Review photo"
              className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 shadow-md hover:bg-gray-100 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewsPage() {
  const dispatch = useAppDispatch();
  const {
    reviewsSummary, recentReviews, reviewsTrend, topRatedProducts,
    loading,
  } = useAppSelector((s) => s.dashboard);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchDashboard(range));
  }, [dispatch, range]);

  const withPhotosPct = reviewsSummary && reviewsSummary.total_reviews > 0
    ? (reviewsSummary.with_photos / reviewsSummary.total_reviews) * 100
    : 0;
  const verifiedPct = reviewsSummary && reviewsSummary.total_reviews > 0
    ? (reviewsSummary.verified_count / reviewsSummary.total_reviews) * 100
    : 0;

  const storeRating    = Number(reviewsSummary?.store_rating  ?? 0);
  const totalReviews   = reviewsSummary?.total_reviews  ?? 0;
  const fiveStarCount  = reviewsSummary?.five_star       ?? 0;
  const fiveStarPct    = totalReviews > 0 ? (fiveStarCount / totalReviews) * 100 : 0;

  const showPageLoader = loading && !reviewsSummary;

  return (
    <DrawerProvider>
      <InfoDrawer />
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard
              label="Store Rating"
              value={`★ ${storeRating.toFixed(1)}`}
              sub={storeRating >= 4.7
                ? 'Excellent · top-tier trust'
                : storeRating >= 4.5
                  ? 'Very good · above average'
                  : storeRating >= 4.0
                    ? 'Good · room to improve'
                    : 'Needs improvement'}
              loading={loading}
            />
            <KpiCard
              label="Total Reviews"
              value={formatNum(totalReviews)}
              sub={totalReviews >= 200
                ? 'Strong social proof'
                : totalReviews >= 50
                  ? 'Growing review base'
                  : 'Collect more reviews'}
              loading={loading}
            />
            <KpiCard
              label="5★ Reviews"
              value={formatNum(fiveStarCount)}
              sub={fiveStarPct >= 80
                ? `${fiveStarPct.toFixed(0)}% · Excellent NPS signal`
                : fiveStarPct >= 65
                  ? `${fiveStarPct.toFixed(0)}% · Good satisfaction`
                  : `${fiveStarPct.toFixed(0)}% · Below 65% benchmark`}
              loading={loading}
            />
            <KpiCard
              label="With Photos"
              value={formatNum(reviewsSummary?.with_photos)}
              sub={withPhotosPct >= 30
                ? `${formatPct(withPhotosPct)} · Strong UGC`
                : withPhotosPct >= 15
                  ? `${formatPct(withPhotosPct)} · Moderate UGC`
                  : `${formatPct(withPhotosPct)} · Encourage photo reviews`}
              loading={loading}
            />
            <KpiCard
              label="Verified"
              value={formatNum(reviewsSummary?.verified_count)}
              sub={verifiedPct >= 70
                ? `${formatPct(verifiedPct)} · High trust`
                : verifiedPct >= 40
                  ? `${formatPct(verifiedPct)} · Good verification`
                  : `${formatPct(verifiedPct)} of total`}
              loading={loading}
            />
          </div>

          {/* Rating Donut + Rating Trend + UGC Trend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel
              title="Rating Summary"
              subtitle="Overall score breakdown"
              info={{ what: 'Store-level rating and percentage breakdown by star level.', source: 'Judge.me Reviews' }}
              ai={{ observation: `Store rating of ${Number(reviewsSummary?.store_rating ?? 0).toFixed(1)}★ ${(reviewsSummary?.store_rating ?? 0) >= 4.5 ? 'is excellent' : 'needs improvement'}.`, insight: 'Ratings above 4.5★ with 50+ reviews dramatically improve conversion rate. Focus on preventing 1–2 star reviews through proactive post-delivery follow-up rather than just collecting more 5★.', actions: ['Send review request 7 days after delivery confirmation', 'Respond to all 1–3 star reviews within 24 hours publicly', 'Incentivise photo reviews with 5% off next order'] }}
            >
              <RatingSummaryCard data={reviewsSummary} trend={reviewsTrend} />
            </Panel>
            <Panel
              title="Rating Trend"
              subtitle="Average rating over time"
              info={{ what: 'Average star rating of reviews received each day over the period.', source: 'Judge.me Reviews', readIt: 'Dips below 4.0 on specific dates warrant investigation — usually correlated with a product or fulfilment issue.' }}
              ai={{ observation: 'Rating trend shows overall product and experience quality signal over time.', insight: 'Identify exact dates where average rating drops sharply — these almost always correlate with a specific product batch, courier change, or packaging issue. Fix the root cause, not just the symptom.', actions: ['Correlate rating dips with shipment dates and courier used', 'Flag product titles appearing in 1-star reviews for QC review', 'Set alert when 7-day rolling rating drops below 4.2★'] }}
            >
              <RatingTrendChart data={reviewsTrend} />
            </Panel>
            <Panel
              title="Review Volume Trend"
              subtitle="Daily review count"
              info={{ what: 'Number of reviews received each day in the selected period.', source: 'Judge.me Reviews', readIt: 'Sustained review volume indicates healthy post-purchase engagement. Spikes may correlate with campaigns.' }}
              ai={{ observation: 'Review velocity is a compound metric — it reflects both sales volume and post-purchase engagement quality.', insight: 'Low review rates (< 3% of orders) indicate your review request flow needs improvement. The subject line and timing of the request email are the biggest levers.', metrics: [{ label: 'Total Reviews', value: formatNum(reviewsSummary?.total_reviews) }, { label: 'With Photos', value: formatNum(reviewsSummary?.with_photos) }], actions: ['A/B test review request email subject lines', 'Send request at 7 days post-delivery (not at purchase)', 'Offer photo review incentive to boost UGC rate'] }}
            >
              <UgcTrendChart data={reviewsTrend} />
            </Panel>
          </div>

          {/* Avg Rating Trend + Top vs Bottom Rated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel
              title="Avg Rating Trend"
              subtitle="Rating vs review count over time"
              info={{ what: 'Average star rating (line) overlaid on daily review count (bars). Dashed line marks the 4.5★ excellence threshold.', source: 'Judge.me Reviews', readIt: 'Watch for divergence: rising review count with falling rating signals a quality issue at scale.' }}
              ai={{ observation: 'Combining rating and volume reveals whether quality scales with growth.', insight: 'The most dangerous pattern is a steady rating decline masked by growing volume — the brand looks healthy in aggregate while new customers are quietly dissatisfied. Track the gap between the trend line and 4.5★ reference over time.', actions: ['Investigate any day the average drops below 4.2★', 'Cross-reference low-rating dates with fulfilment events', 'Set up weekly alert if 7-day rolling avg dips below 4.3★'] }}
            >
              <AvgRatingTrendChart data={reviewsTrend} />
            </Panel>
            {/* Rating Distribution — disabled
            <Panel
              title="Rating Distribution"
              subtitle="Review count by star level"
              info={{ what: 'Total number of reviews at each star level.', source: 'Judge.me Reviews', readIt: 'A healthy brand has 70%+ in 5★ and < 5% in 1–2★ combined.' }}
              ai={{ observation: 'Rating distribution reveals product-market fit at a glance.', insight: 'The ratio of positive to negative reviews is the best single metric for product quality. Each 1★ review costs ~5 lost potential customers who read it without buying.', actions: ['Target: 5★ reviews > 70% of total', 'Identify top-3 complaint themes in 1–2★ reviews and fix them', 'Request review removal for resolved complaints where policy allows'] }}
            >
              <RatingDistributionBar data={reviewsSummary} />
            </Panel>
            */}
            <Panel
              title="Top vs Bottom Rated"
              subtitle="Products by average rating"
              info={{ what: 'Products sorted by average customer rating — top 5 and bottom 5.', source: 'Judge.me Reviews', readIt: 'Products below 3.5★ with 10+ reviews should be reviewed for quality issues or delisted.' }}
              ai={{ observation: 'Rating spread across products reveals quality consistency issues.', insight: 'Bottom-rated products are active brand risk — every new buyer who gets a poor experience is a potential negative review multiplied by their social reach. Consider pausing low-rated SKUs until quality is fixed.', actions: ['Pause advertising for products rated < 3.5★', 'Initiate quality review for bottom-rated SKUs', 'Bundle top-rated products with bottom-rated for forced trial with a safety net'] }}
            >
              <TopBottomRatedChart data={topRatedProducts} />
            </Panel>
          </div>

          {/* Recent Reviews Feed */}
          <Panel
            title="Recent Reviews"
            subtitle="Latest customer feedback"
            info={{ what: 'Most recent reviews submitted across all products in the selected period.', source: 'Judge.me Reviews' }}
            ai={{ observation: 'Recent reviews are a real-time signal of current product and delivery experience quality.', insight: 'Read recent 1-star reviews within 24 hours — they reveal operational issues faster than any dashboard metric. Common patterns: wrong product, damaged packaging, late delivery, poor quality. Each is actionable.', actions: ['Respond to every negative review within 24 hours', 'Use positive review language verbatim in ad copy', 'Forward product-quality complaints to the operations team immediately'] }}
          >
            <RecentReviewsCards data={recentReviews} />
          </Panel>

        </main>
      </div>
    </DrawerProvider>
  );
}
