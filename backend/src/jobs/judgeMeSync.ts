import db from '../config/database';
import { fetchStoreSummary, fetchAllProducts, fetchAllReviews, JudgeMeReview, JudgeMeProduct } from '../connectors/judgeMe';

async function upsertReviews(reviews: JudgeMeReview[]): Promise<number> {
  let count = 0;
  for (const r of reviews) {
    await db.query(
      `INSERT INTO judgeme_reviews
        (review_id, product_external_id, product_handle, rating, title, body,
         reviewer_name, reviewer_email, created_at, published, verified,
         has_photos, picture_urls, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (review_id) DO UPDATE SET
         published = EXCLUDED.published,
         rating = EXCLUDED.rating,
         synced_at = NOW()`,
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
    count++;
  }
  return count;
}

async function upsertProducts(products: JudgeMeProduct[]): Promise<void> {
  for (const p of products) {
    await db.query(
      `INSERT INTO judgeme_products
        (product_id, external_id, handle, title, average_rating, reviews_count, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (product_id) DO UPDATE SET
         average_rating = EXCLUDED.average_rating,
         reviews_count = EXCLUDED.reviews_count,
         updated_at = EXCLUDED.updated_at,
         synced_at = NOW()`,
      [p.id, p.external_id, p.handle, p.title, p.average_rating, p.reviews_count, p.updated_at]
    );
  }
}

export async function syncJudgeMe(): Promise<void> {
  try {
    // 1. Store summary
    const summary = await fetchStoreSummary();
    await db.query(
      `INSERT INTO judgeme_store_summary (average_rating, total_reviews)
       VALUES ($1, $2)`,
      [summary.rating, summary.count]
    );

    // 2. Products
    const products = await fetchAllProducts();
    await upsertProducts(products);

    // 3. Reviews since last sync
    const { rows } = await db.query(
      "SELECT last_sync_at FROM connector_health WHERE connector_name = 'judgeme'"
    );
    const lastSync: string | undefined = rows[0]?.last_sync_at?.toISOString().split('T')[0];
    const reviews = await fetchAllReviews(lastSync);
    const count = await upsertReviews(reviews);

    await db.query(
      `UPDATE connector_health
       SET last_sync_at = NOW(), status = 'green', records_synced = $1, error_message = NULL
       WHERE connector_name = 'judgeme'`,
      [count]
    );

    console.log(`[Judge.me] Synced ${count} reviews, ${products.length} products`);
  } catch (err) {
    await db.query(
      `UPDATE connector_health SET status = 'red', error_message = $1
       WHERE connector_name = 'judgeme'`,
      [(err as Error).message]
    );
    console.error('[Judge.me] Sync error:', (err as Error).message);
  }
}
