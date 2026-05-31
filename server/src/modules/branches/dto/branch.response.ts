import type { BranchOrmEntity } from '../branch.orm-entity';

export interface BranchResponse {
  id: string;
  code: string;
  name: string;
  rnc: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchesListResponse {
  items: BranchResponse[];
  total: number;
  limit: number;
  offset: number;
}

export function toBranchResponse(b: BranchOrmEntity): BranchResponse {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    rnc: b.rnc,
    address: b.address,
    phone: b.phone,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
