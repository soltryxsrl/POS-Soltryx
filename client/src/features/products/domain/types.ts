import type { MoneyDto } from '@/shared/types/enums';
import type { Category } from '@/features/categories/domain/types';

export interface Product {
  id: string;
  branchId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  category?: Category | null;
  costPrice: MoneyDto;
  salePrice: MoneyDto;
  taxRate: string;
  stock: string;
  minStock: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  costPrice?: MoneyDto;
  salePrice: MoneyDto;
  taxRate?: string;
  initialStock?: string;
  minStock?: string;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  description?: string | null;
  categoryId?: string | null;
  costPrice?: MoneyDto;
  salePrice?: MoneyDto;
  taxRate?: string;
  minStock?: string;
  isActive?: boolean;
}

export interface ListProductsParams {
  q?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  limit?: number;
  offset?: number;
}
