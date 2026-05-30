import type { MoneyDto } from '@/shared/types/enums';
import type { Category } from '@/features/categories/domain/types';

export interface Product {
  id: string;
  branchId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  category?: Category | null;
  costPrice: MoneyDto;
  salePrice: MoneyDto;
  taxRate: string;
  /** Código del tipo de ITBIS (catálogo tax_types). Null = tasa libre legacy. */
  taxTypeCode: string | null;
  stock: string;
  minStock: string;
  isActive: boolean;
  /** Si true, este producto es un kit/combo y vende stock de sus componentes. */
  isKit: boolean;
  /** Si true, este producto se vende por sus variantes (talla/color/sabor). */
  hasVariants: boolean;
  /** Si true, se vende por peso (kg): el POS muestra unidad y admite decimales. */
  soldByWeight: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string | null;
  costPrice: string | null;
  stock: string;
  minStock: string;
  isActive: boolean;
}

export interface CreateVariantInput {
  name: string;
  sku: string;
  barcode?: string;
  salePrice?: string;
  costPrice?: string;
  initialStock?: string;
  minStock?: string;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  salePrice?: string | null;
  costPrice?: string | null;
  minStock?: string;
  isActive?: boolean;
}

export interface KitComponent {
  id: string;
  productId: string;
  componentProductId: string;
  componentName: string;
  componentSku: string;
  quantity: string;
}

export interface SetKitComponentsInput {
  components: Array<{
    productId: string;
    quantity: string;
  }>;
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
  imageUrl?: string;
  categoryId?: string;
  costPrice?: MoneyDto;
  salePrice: MoneyDto;
  taxRate?: string;
  /** Si se provee, el servidor deriva taxRate de la tasa del tipo. */
  taxTypeCode?: string;
  initialStock?: string;
  minStock?: string;
  isActive?: boolean;
  isKit?: boolean;
  soldByWeight?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  costPrice?: MoneyDto;
  salePrice?: MoneyDto;
  taxRate?: string;
  /** Si se provee, el servidor deriva taxRate de la tasa del tipo. */
  taxTypeCode?: string | null;
  minStock?: string;
  isActive?: boolean;
  isKit?: boolean;
  hasVariants?: boolean;
  soldByWeight?: boolean;
}

export type ProductTypeFilter = 'simple' | 'kit' | 'variant';

export interface ListProductsParams {
  q?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  type?: ProductTypeFilter;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}
