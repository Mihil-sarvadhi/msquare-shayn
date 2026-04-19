import { JudgemeReview, JudgemeProduct, JudgemeStoreSummary } from '@db/models';
import { fetchAllReviews, fetchAllProducts, fetchStoreSummary } from './judgeme.connector';
import { logger } from '@logger/logger';

export async function judgemeBackfill(): Promise<void> {
  logger.info('[Judge.me Backfill] Pulling ALL historical reviews...');

  try {
    const summary = await fetchStoreSummary();
    await JudgemeStoreSummary.create({ average_rating: summary.rating, total_reviews: summary.count });
    logger.info(`[Judge.me Backfill] Store summary: ${summary.rating}★ across ${summary.count} reviews`);
  } catch (err) {
    logger.error(`[Judge.me Backfill] Store summary error: ${(err as Error).message}`);
  }

  logger.info('[Judge.me Backfill] Fetching products...');
  const products = await fetchAllProducts();
  for (const p of products) {
    await JudgemeProduct.upsert({
      product_id: p.id,
      external_id: p.external_id,
      handle: p.handle,
      title: p.title,
      average_rating: p.average_rating,
      reviews_count: p.reviews_count,
      updated_at: new Date(p.updated_at),
    });
  }
  logger.info(`[Judge.me Backfill] Synced ${products.length} products.`);

  logger.info('[Judge.me Backfill] Fetching all reviews (no date filter)...');
  const reviews = await fetchAllReviews();
  let count = 0;
  for (const r of reviews) {
    await JudgemeReview.upsert({
      review_id: r.id,
      product_id: r.product_external_id != null ? Number(r.product_external_id) : undefined,
      external_id: r.product_handle || undefined,
      rating: r.rating,
      title: r.title || undefined,
      body: r.body || undefined,
      reviewer_name: r.reviewer?.name || undefined,
      reviewer_email: r.reviewer?.email || undefined,
      created_at: r.created_at?.split('T')[0] || undefined,
      published: r.published ?? true,
      verified: !!r.verified,
      has_photos: r.pictures?.length > 0,
      picture_urls: r.pictures?.map((p) => p.urls?.original).filter(Boolean).join(',') || undefined,
      source: r.source || undefined,
    });
    count++;
  }

  logger.info(`[Judge.me Backfill] Done. Inserted ${count} reviews.`);
}

if (require.main === module) {
  judgemeBackfill().catch((err) => { logger.error(err); process.exit(1); });
}
