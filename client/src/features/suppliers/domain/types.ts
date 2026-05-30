export interface Supplier {
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

export interface SuppliersList {
  items: Supplier[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateSupplierInput {
  tradeName: string;
  legalName?: string;
  rnc?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface ListSuppliersParams {
  q?: string;
  isActive?: 'true' | 'false';
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}
