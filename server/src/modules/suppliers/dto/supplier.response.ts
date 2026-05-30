import type { SupplierOrmEntity } from '../supplier.orm-entity';

export interface SupplierResponse {
  id: string;
  branchId: string | null;
  tradeName: string;
  legalName: string | null;
  rnc: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersListResponse {
  items: SupplierResponse[];
  total: number;
  limit: number;
  offset: number;
}

export function toSupplierResponse(s: SupplierOrmEntity): SupplierResponse {
  return {
    id: s.id,
    branchId: s.branchId,
    tradeName: s.tradeName,
    legalName: s.legalName,
    rnc: s.rnc,
    contactName: s.contactName,
    phone: s.phone,
    email: s.email,
    address: s.address,
    notes: s.notes,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
