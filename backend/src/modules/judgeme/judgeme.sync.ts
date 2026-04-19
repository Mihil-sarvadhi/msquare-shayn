import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth, JudgemeReview, JudgemeProduct, JudgemeStoreSummary } from '@db/models';
import {
  fetchStoreSummary,
  fetchAllProducts,
  fetchAllReviews,
  type JudgeMeReview,
  type JudgeMeProduct,
} from './judgeme.connector';
import { logger } from '@logger/logger';

async function upsertReviews(reviews: JudgeMeReview[]): Promise<number> {
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
  return count;
}

async function upsertProducts(products: JudgeMeProduct[]): Promise<void> {
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
}

export async function syncJudgeMe(): Promise<void> {
  try {
    const summary = await fetchStoreSummary();
    await JudgemeStoreSummary.create({
      average_rating: summary.rating,
      total_reviews: summary.count,
    });

    const products = await fetchAllProducts();
    await upsertProducts(products);

    const [healthRow] = await sequelize.query<{ last_sync_at: Date | null }>(
      `SELECT last_sync_at FROM connector_health WHERE connector_name = 'judgeme'`,
      { type: QueryTypes.SELECT }
    );
    const lastSync: string | undefined = healthRow?.last_sync_at?.toISOString().split('T')[0];
    const reviews = await fetchAllReviews(lastSync);
    const count = await upsertReviews(reviews);

    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', records_synced: count, error_message: undefined },
      { where: { connector_name: 'judgeme' } }
    );

    logger.info(`[Judge.me] Synced ${count} reviews, ${products.length} products`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'judgeme' } }
    );
    logger.error(`[Judge.me] Sync error: ${(err as Error).message}`);
  }
}
