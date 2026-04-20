import axios from 'axios';

const BASE = 'https://judge.me/api/v1';
const AUTH = {
  api_token: process.env.JUDGEME_API_TOKEN as string,
  shop_domain: process.env.JUDGEME_SHOP_DOMAIN as string,
};

export interface JudgeMeReview {
  id: number;
  title: string;
  body: string;
  rating: number;
  reviewer: { name: string; email: string };
  created_at: string;
  updated_at: string;
  published: boolean;
  verified: boolean | string;
  product_external_id: number | null;
  product_handle: string | null;
  product_title: string | null;
  pictures: { urls: { original: string } }[];
  source: string;
}

export interface JudgeMeProduct {
  id: number;
  external_id: string;
  handle: string;
  title: string;
  average_rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface JudgeMeAggregate {
  rating: number;
  count: number;
}

export async function fetchAllReviews(sinceDate?: string): Promise<JudgeMeReview[]> {
  let allReviews: JudgeMeReview[] = [];
  let page = 1;
  const cutoff = sinceDate ? new Date(sinceDate) : null;

  while (true) {
    const res = await axios.get<{ reviews: JudgeMeReview[] }>(`${BASE}/reviews`, {
      params: { ...AUTH, page, per_page: 100 },
    });

    const reviews = res.data.reviews || [];
    if (reviews.length === 0) break;

    if (cutoff) {
      const oldest = new Date(reviews[reviews.length - 1].created_at);
      if (oldest < cutoff) {
        allReviews = allReviews.concat(reviews.filter((r) => new Date(r.created_at) >= cutoff));
        break;
      }
    }

    allReviews = allReviews.concat(reviews);
    page++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return allReviews;
}

export async function fetchAllProducts(): Promise<JudgeMeProduct[]> {
  let allProducts: JudgeMeProduct[] = [];
  let page = 1;

  while (true) {
    const res = await axios.get<{ products: JudgeMeProduct[] }>(`${BASE}/products`, {
      params: { ...AUTH, page, per_page: 100 },
    });

    const products = res.data.products || [];
    if (products.length === 0) break;

    allProducts = allProducts.concat(products);
    page++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return allProducts;
}

export async function fetchStoreSummary(): Promise<JudgeMeAggregate> {
  const res = await axios.get<JudgeMeAggregate>('https://judge.me/api/reviews/aggregate_feed', {
    params: AUTH,
  });
  return res.data;
}
