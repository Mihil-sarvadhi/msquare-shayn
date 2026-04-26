import { z } from 'zod';

export const dateRangeSchema = z.enum(['7d', '30d', '90d']);

export const reviewFilterSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReviewFilterValues = z.infer<typeof reviewFilterSchema>;
