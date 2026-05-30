import { http } from '@/shared/lib/http-client';
import type {
  CreatePromotionInput,
  ListPromotionsParams,
  Promotion,
  PromotionsList,
  UpdatePromotionInput,
} from '../../domain/types';

export const promotionsApiHttp = {
  list: (params: ListPromotionsParams = {}) =>
    http<PromotionsList>('/promotions', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),
  findById: (id: string) => http<Promotion>(`/promotions/${id}`),
  create: (input: CreatePromotionInput) =>
    http<Promotion>('/promotions', { method: 'POST', body: input }),
  update: (id: string, input: UpdatePromotionInput) =>
    http<Promotion>(`/promotions/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => http<void>(`/promotions/${id}`, { method: 'DELETE' }),
};
