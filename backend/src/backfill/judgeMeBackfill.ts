import * as dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import { fetchAllReviews, fetchAllProducts, fetchStoreSummary, JudgeMeReview, JudgeMeProduct } from '../connectors/judgeMe';

async function judgeMeBackfill(): Promise<void> {
  console.log('[Judge.me Backfill] Pulling ALL historical reviews...');

  // 1. Store summary
  try {
    const summary = await fetchStoreSummary();
    await db.query(
      `INSERT INTO judgeme_store_summary (average_rating, total_reviews) VALUES ($1, $2)`,
      [summary.rating, summary.count]
    );
    console.log(`[Judge.me Backfill] Store summary: ${summary.rating}★ across ${summary.count} reviews`);
  } catch (err) {
    console.error('[Judge.me Backfill] Store summary error:', (err as Error).message);
  }

  // 2. Products
  console.log('[Judge.me Backfill] Fetching products...');
  const products = await fetchAllProducts();
  for (const p of products) {
    await db.query(
      `INSERT INTO judgeme_products
        (product_id, external_id, handle, title, average_rating, reviews_count, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (product_id) DO UPDATE SET
         average_rating = EXCLUDED.average_rating,
         reviews_count = EXCLUDED.reviews_count,
         synced_at = NOW()`,
      [p.id, p.external_id, p.handle, p.title, p.average_rating, p.reviews_count, p.updated_at]
    );
  }
  console.log(`[Judge.me Backfill] Inserted ${products.length} products`);

  // 3. All reviews (no date limit)
  console.log('[Judge.me Backfill] Fetching all reviews...');
  const reviews = await fetchAllReviews();
  let inserted = 0;
  for (const r of reviews) {
    await db.query(
      `INSERT INTO judgeme_reviews
        (review_id, product_external_id, product_handle, rating, title, body,
         reviewer_name, reviewer_email, created_at, published, verified,
         has_photos, picture_urls, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (review_id) DO NOTHING`,
      [
        r.id,
        r.product_external_id != null ? String(r.product_external_id) : null,
        r.product_handle || null,
        r.rating,
        r.title || null,
        r.body || null,
        r.reviewer?.name || null,
        r.reviewer?.email || null,
        r.created_at?.split('T')[0] || null,
        r.published ?? true,
        !!r.verified,
        r.pictures?.length > 0,
        r.pictures?.map((p) => p.urls?.original).filter(Boolean).join(',') || null,
        r.source || null,
      ]
    );
    inserted++;
  }

  // Update connector health
  await db.query(
    `UPDATE connector_health
     SET last_sync_at = NOW(), status = 'green', records_synced = $1, error_message = NULL
     WHERE connector_name = 'judgeme'`,
    [inserted]
  );

  console.log(`[Judge.me Backfill] Done. Inserted ${inserted} reviews, ${products.length} products.`);
  await db.end();
}

judgeMeBackfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
