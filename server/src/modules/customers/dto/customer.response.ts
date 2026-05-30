import type { CustomerOrmEntity } from '../customer.orm-entity';

export interface CustomerResponse {
  id: string;
  branchId: string | null;
  documentType: string | null;
  document: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersListResponse {
  items: CustomerResponse[];
  total: number;
  limit: number;
  offset: number;
}

export function toCustomerResponse(c: CustomerOrmEntity): CustomerResponse {
  return {
    id: c.id,
    branchId: c.branchId,
    documentType: c.documentType,
    document: c.document,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    address: c.address,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
