import { useState, useEffect, useCallback } from 'react';
import baseService from '@services/baseService';
import type { RecentReview } from '@app/types/dashboard';

const ratingColor = (r: number) => r >= 4 ? '#C9991A' : r === 3 ? '#B45309' : '#C0394B';

function Stars({ rating }: { rating: number }) {
  const c = ratingColor(rating);
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= rating ? c : '#E5DDD0', fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

function PhotoModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActive((a) => (a + 1) % urls.length);
      if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + urls.length) % urls.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [urls, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-parch flex items-center justify-center" style={{ height: 420 }}>
          <img src={urls[active]} alt="Review" className="max-h-full max-w-full object-contain" />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/60 text-white flex items-center justify-center text-sm hover:bg-ink transition-colors">✕</button>
          {urls.length > 1 && (
            <>
              <button onClick={() => setActive((a) => (a - 1 + urls.length) % urls.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/50 text-white flex items-center justify-center text-lg hover:bg-ink transition-colors">‹</button>
              <button onClick={() => setActive((a) => (a + 1) % urls.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/50 text-white flex items-center justify-center text-lg hover:bg-ink transition-colors">›</button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white bg-ink/50 px-2 py-0.5 rounded-full">{active + 1} / {urls.length}</span>
            </>
          )}
        </div>
        {urls.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-ivory">
            {urls.map((u, i) => (
              <img key={i} src={u} alt="" onClick={() => setActive(i)}
                className={`h-16 w-16 object-cover rounded-lg cursor-pointer shrink-0 border-2 transition-colors ${i === active ? 'border-gold' : 'border-transparent'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ r, onPhotoClick }: { r: RecentReview; onPhotoClick: (urls: string[]) => void }) {
  const c = ratingColor(r.rating);
  const urls = r.picture_urls?.split(',').map((u) => u.trim()).filter(Boolean) || [];
  return (
    <div className="bg-white border border-parch rounded-xl p-4 flex flex-col gap-2.5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Stars rating={r.rating} />
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: c + '22', color: c }}>{r.rating}★</span>
      </div>
      {r.title && <p className="text-sm font-semibold text-ink line-clamp-2 leading-snug">{r.title}</p>}
      {r.body  && <p className="text-sm text-muted line-clamp-4 flex-1 leading-relaxed">{r.body}</p>}
      <div className="mt-auto pt-3 border-t border-parch/60 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-ink truncate">{r.reviewer_name || 'Anonymous'}</span>
          <span className="text-xs text-muted shrink-0">
            {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        {r.product_title && <p className="text-xs text-muted truncate">{r.product_title}</p>}
        <div className="flex gap-1.5 flex-wrap pt-0.5">
          {r.verified && (
            <span className="text-[10px] bg-emerald/10 text-emerald px-1.5 py-0.5 rounded-full font-medium">✓ Verified</span>
          )}
          {urls.length > 0 && (
            <button onClick={() => onPhotoClick(urls)}
              className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-medium hover:bg-gold/20 transition-colors cursor-pointer">
              📷 {urls.length} Photo{urls.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const LIMIT = 20;

export default function AllReviewsPage() {
  const [reviews, setReviews]   = useState<RecentReview[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [rating, setRating]     = useState(0);
  const [search, setSearch]     = useState('');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading]   = useState(true);
  const [photoUrls, setPhotoUrls] = useState<string[] | null>(null);

  const fetch = useCallback(async (pg: number, rt: number, sq: string) => {
    setLoading(true);
    try {
      const { data } = await baseService.get('/dashboard/all-reviews', { params: { page: pg, limit: LIMIT, rating: rt || '', search: sq } });
      setReviews(data.reviews);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(page, rating, search); }, [page, rating, search, fetch]);

  const handleRating = (r: number) => { setRating(r); setPage(1); };
  const handleSearch = () => { setSearch(inputVal); setPage(1); };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-ivory font-sans">
      {photoUrls && <PhotoModal urls={photoUrls} onClose={() => setPhotoUrls(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-parch sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-ink">All Reviews</h1>
            <p className="text-xs text-muted">{total.toLocaleString()} reviews total</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex gap-1">
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search reviews…"
                className="text-xs border border-parch rounded-lg px-3 py-1.5 outline-none focus:border-gold transition-colors w-48 bg-ivory"
              />
              <button onClick={handleSearch}
                className="text-xs px-3 py-1.5 rounded-lg bg-gold text-white font-medium hover:bg-gold/90 transition-colors">
                Search
              </button>
              {search && (
                <button onClick={() => { setSearch(''); setInputVal(''); setPage(1); }}
                  className="text-xs px-2 py-1.5 rounded-lg border border-parch text-muted hover:border-ruby hover:text-ruby transition-colors">✕</button>
              )}
            </div>
            {/* Star filter */}
            <div className="flex items-center gap-1">
              <button onClick={() => handleRating(0)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${rating === 0 ? 'border-gold bg-gold/10 text-gold font-semibold' : 'border-parch text-muted hover:border-muted'}`}>
                All
              </button>
              {[5, 4, 3, 2, 1].map((s) => (
                <button key={s} onClick={() => handleRating(s)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${rating === s ? 'border-gold bg-gold/10 text-gold font-semibold' : 'border-parch text-muted hover:border-muted'}`}>
                  {s}★
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-52 bg-parch animate-pulse rounded-xl" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted">
            <span className="text-4xl mb-3">★</span>
            <p className="text-sm">No reviews match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {reviews.map((r) => <ReviewCard key={r.review_id} r={r} onPhotoClick={setPhotoUrls} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="text-xs px-3 py-1.5 rounded-lg border border-parch text-muted hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              ← Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pg: number;
              if (totalPages <= 7) pg = i + 1;
              else if (page <= 4) pg = i + 1;
              else if (page >= totalPages - 3) pg = totalPages - 6 + i;
              else pg = page - 3 + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`text-xs w-8 h-8 rounded-lg border transition-colors ${pg === page ? 'border-gold bg-gold text-white font-semibold' : 'border-parch text-muted hover:border-gold hover:text-gold'}`}>
                  {pg}
                </button>
              );
            })}
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
              className="text-xs px-3 py-1.5 rounded-lg border border-parch text-muted hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        )}
        {total > 0 && (
          <p className="text-center text-xs text-muted mt-3">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()} reviews
          </p>
        )}
      </main>
    </div>
  );
}
