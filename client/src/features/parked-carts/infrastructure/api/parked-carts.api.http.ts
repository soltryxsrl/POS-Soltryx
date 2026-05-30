import { http } from '@/shared/lib/http-client';
import type { CreateParkedCartInput, ParkedCart } from '../../domain/types';

export const parkedCartsApiHttp = {
  list: (cashSessionId: string) =>
    http<ParkedCart[]>('/parked-carts', { searchParams: { cashSessionId } }),

  findById: (id: string) => http<ParkedCart>(`/parked-carts/${id}`),

  create: (input: CreateParkedCartInput) =>
    http<ParkedCart>('/parked-carts', { method: 'POST', body: input }),

  remove: (id: string) =>
    http<void>(`/parked-carts/${id}`, { method: 'DELETE' }),
};
