export interface Branch {
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

export interface BranchesList {
  items: Branch[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListBranchesParams {
  q?: string;
  isActive?: 'true' | 'false';
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreateBranchInput {
  code: string;
  name: string;
  rnc?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  rnc?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface CloneCatalogResult {
  categoriesCreated: number;
  productsCreated: number;
  variantsCreated: number;
  kitComponentsCreated: number;
  barcodesCreated: number;
  barcodesSkipped: number;
  kitComponentsSkipped: number;
  skipped: number;
}
