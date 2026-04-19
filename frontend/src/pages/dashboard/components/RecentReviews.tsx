import React, { useState } from 'react';
import { RecentReview } from '@app/types/dashboard';

interface Props {
  reviews: RecentReview[];
  loading: boolean;
}

const ratingColor = (r: number) => r >= 4 ? '#C9991A' : r === 3 ? '#B45309' : '#C0394B';

function Stars({ rating }: { rating: number }) {
  const c = ratingColor(rating);
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <span key={s} style={{ color: s <= rating ? c : '#E5DDD0', fontSize: 11 }}>★</span>
      ))}
    </span>
  );
}

function PhotoModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [active, setActive] = useState(0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Main image */}
        <div className="relative bg-parch flex items-center justify-center" style={{ height: 340 }}>
          <img src={urls[active]} alt="Review" className="max-h-full max-w-full object-contain" />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/60 text-white flex items-center justify-center text-sm hover:bg-ink transition-colors">
            ✕
          </button>
          {urls.length > 1 && (
            <>
              <button onClick={() => setActive((a) => (a - 1 + urls.length) % urls.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/50 text-white flex items-center justify-center hover:bg-ink transition-colors">
                ‹
              </button>
              <button onClick={() => setActive((a) => (a + 1) % urls.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/50 text-white flex items-center justify-center hover:bg-ink transition-colors">
                ›
              </button>
            </>
          )}
        </div>
        {/* Thumbnails */}
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

export default function RecentReviews({ reviews, loading }: Props) {
  const [filter, setFilter] = useState<number | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[] | null>(null);

  if (loading) return (
    <div className="grid grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => <div key={i} className="h-36 bg-parch animate-pulse rounded-xl" />)}
    </div>
  );
  if (!reviews || !reviews.length) return <p className="text-muted text-sm">No reviews yet</p>;

  const counts = [5,4,3,2,1].map((s) => ({ star: s, n: reviews.filter((r) => r.rating === s).length })).filter((c) => c.n > 0);
  const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews;

  const openPhotos = (e: React.MouseEvent, urls: string) => {
    e.stopPropagation();
    const list = urls.split(',').map((u) => u.trim()).filter(Boolean);
    if (list.length) setPhotoUrls(list);
  };

  return (
    <>
      {photoUrls && <PhotoModal urls={photoUrls} onClose={() => setPhotoUrls(null)} />}

      <div className="space-y-3">
        {/* Filter pills + View All */}
        <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilter(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filter ? 'border-gold bg-gold/10 text-gold font-semibold' : 'border-parch text-muted hover:border-muted'}`}>
            All ({reviews.length})
          </button>
          {counts.map(({ star, n }) => (
            <button key={star} onClick={() => setFilter(filter === star ? null : star)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filter === star ? 'border-gold bg-gold/10 text-gold font-semibold' : 'border-parch text-muted hover:border-muted'}`}>
              {star}★ ({n})
            </button>
          ))}
        </div>
        <button
          onClick={() => window.open(window.location.origin + window.location.pathname + '#/reviews', '_blank')}
          className="text-xs px-3 py-1 rounded-full border border-gold text-gold hover:bg-gold/10 transition-colors font-medium shrink-0">
          View All →
        </button>
        </div>

        {/* 5-column grid */}
        <div className="grid grid-cols-5 gap-3">
          {filtered.map((r) => {
            const c = ratingColor(r.rating);
            const urls = r.picture_urls?.split(',').map((u) => u.trim()).filter(Boolean) || [];
            return (
              <div key={r.review_id} className="border border-parch rounded-xl p-3 flex flex-col gap-2 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} />
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: c + '22', color: c }}>{r.rating}★</span>
                </div>

                {r.title && <p className="text-xs font-semibold text-ink line-clamp-1">{r.title}</p>}
                {r.body  && <p className="text-xs text-muted line-clamp-3 flex-1 leading-relaxed">{r.body}</p>}

                <div className="mt-auto pt-2 border-t border-parch/60 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium text-ink truncate">{r.reviewer_name || 'Anonymous'}</span>
                    <span className="text-[10px] text-muted shrink-0">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  {r.product_title && <p className="text-[10px] text-muted truncate">{r.product_title}</p>}
                  {(r.verified || urls.length > 0) && (
                    <div className="flex gap-1 pt-0.5 flex-wrap">
                      {r.verified && (
                        <span className="text-[9px] bg-emerald/10 text-emerald px-1.5 py-0.5 rounded-full font-medium">✓ Verified</span>
                      )}
                      {urls.length > 0 && (
                        <button onClick={(e) => openPhotos(e, r.picture_urls!)}
                          className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-medium hover:bg-gold/20 transition-colors cursor-pointer">
                          📷 {urls.length} Photo{urls.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
