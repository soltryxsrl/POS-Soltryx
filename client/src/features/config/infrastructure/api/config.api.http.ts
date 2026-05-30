import { http } from '@/shared/lib/http-client';
import type { BusinessInfo, UpdateBusinessInput } from '../../domain/types';

export const configApiHttp = {
  getBusiness: () => http<BusinessInfo>('/config/business'),
  updateBusiness: (input: UpdateBusinessInput) =>
    http<BusinessInfo>('/config/business', { method: 'PUT', body: input }),
};
