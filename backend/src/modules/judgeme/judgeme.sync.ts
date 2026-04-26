import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth, JudgemeReview, JudgemeProduct, JudgemeStoreSummary } from '@db/models';
import {
  fetchAllProducts,
  fetchAllReviews,
  type JudgeMeReview,
  type JudgeMeProduct,
} from './judgeme.connector';
import { logger } from '@logger/logger';
import { environment } from '@config/config';

async function upsertReviews(reviews: JudgeMeReview[]): Promise<number> {
  let count = 0;
  for (const r of reviews) {
    await JudgemeReview.upsert({
      review_id: BigInt(r.id),
      product_id: r.product_external_id != null ? BigInt(r.product_external_id) : undefined,
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
      picture_urls:
        r.pictures
          ?.map((p) => p.urls?.original)
          .filter(Boolean)
          .join(',') || undefined,
      source: r.source || undefined,
    });
    count++;
  }
  return count;
}

async function upsertProducts(products: JudgeMeProduct[]): Promise<void> {
  for (const p of products) {
    await JudgemeProduct.upsert({
      product_id: BigInt(p.id),
      external_id: p.external_id,
      handle: p.handle,
      title: p.title,
      average_rating: p.average_rating,
      reviews_count: p.reviews_count,
      updated_at: p.updated_at ? new Date(p.updated_at) : new Date(),
    });
  }
}

export async function syncJudgeMe(): Promise<void> {
  if (!environment.judgeme.apiToken || !environment.judgeme.shopDomain) {
    logger.warn('[JudgeMe] Skipping sync — JUDGEME_API_TOKEN or JUDGEME_SHOP_DOMAIN not configured');
    return;
  }
  try {
    const products = await fetchAllProducts();
    await upsertProducts(products);

    const [healthRow] = await sequelize.query<{ last_sync_at: Date | null }>(
      `SELECT last_sync_at FROM connector_health WHERE connector_name = 'judgeme'`,
      { type: QueryTypes.SELECT },
    );
    const lastSync: string | undefined = healthRow?.last_sync_at?.toISOString().split('T')[0];
    const reviews = await fetchAllReviews(lastSync);
    const count = await upsertReviews(reviews);

    // Calculate store summary from all published reviews in DB
    const [summary] = await sequelize.query<{ avg_rating: string; total: string }>(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*) AS total
       FROM judgeme_reviews WHERE published = true`,
      { type: QueryTypes.SELECT },
    );
    if (summary && Number(summary.total) > 0) {
      await JudgemeStoreSummary.create({
        average_rating: parseFloat(summary.avg_rating),
        total_reviews: parseInt(summary.total, 10),
      });
    }

    await ConnectorHealth.update(
      {
        last_sync_at: new Date(),
        status: 'green',
        records_synced: count,
        error_message: undefined,
      },
      { where: { connector_name: 'judgeme' } },
    );

    logger.info(`[Judge.me] Synced ${count} reviews, ${products.length} products`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'judgeme' } },
    );
    logger.error(`[Judge.me] Sync error: ${(err as Error).message}`);
  }
}
