import { http } from '@/shared/lib/http-client';
import type { BusinessInfo, UpdateBusinessInput } from '../../domain/types';

export const configApiHttp = {
  getBusiness: () => http<BusinessInfo>('/config/business'),
  // Encabezado del recibo. Sin branchId = sucursal activa; con branchId = la de
  // la venta (el server la valida: solo se honra si es la activa o el usuario
  // tiene branches.switch).
  getReceiptBusiness: (branchId?: string) =>
    http<BusinessInfo>('/config/business/receipt', {
      searchParams: branchId ? { branchId } : undefined,
    }),
  updateBusiness: (input: UpdateBusinessInput) =>
    http<BusinessInfo>('/config/business', { method: 'PUT', body: input }),
};
