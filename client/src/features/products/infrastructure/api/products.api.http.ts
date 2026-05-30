import { http } from '@/shared/lib/http-client';
import type { ProductsApi } from '../../domain/ports';
import type {
  CreateProductInput,
  CreateVariantInput,
  KitComponent,
  ListProductsParams,
  Product,
  ProductListResponse,
  ProductVariant,
  SetKitComponentsInput,
  UpdateProductInput,
  UpdateVariantInput,
} from '../../domain/types';

export const productsApiHttp: ProductsApi = {
  list: (params?: ListProductsParams) =>
    http<ProductListResponse>('/products', {
      searchParams: params as Record<string, string | number | boolean | undefined> | undefined,
    }),
  findById: (id: string) => http<Product>(`/products/${id}`),
  create: (input: CreateProductInput) =>
    http<Product>('/products', { method: 'POST', body: input }),
  update: (id: string, input: UpdateProductInput) =>
    http<Product>(`/products/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => http<void>(`/products/${id}`, { method: 'DELETE' }),
  listKitComponents: (id: string) =>
    http<KitComponent[]>(`/products/${id}/kit-components`),
  setKitComponents: (id: string, input: SetKitComponentsInput) =>
    http<KitComponent[]>(`/products/${id}/kit-components`, {
      method: 'POST',
      body: input,
    }),
  listVariants: (id: string) =>
    http<ProductVariant[]>(`/products/${id}/variants`),
  createVariant: (id: string, input: CreateVariantInput) =>
    http<ProductVariant>(`/products/${id}/variants`, {
      method: 'POST',
      body: input,
    }),
  updateVariant: (id: string, variantId: string, input: UpdateVariantInput) =>
    http<ProductVariant>(`/products/${id}/variants/${variantId}`, {
      method: 'PATCH',
      body: input,
    }),
  deleteVariant: (id: string, variantId: string) =>
    http<void>(`/products/${id}/variants/${variantId}`, { method: 'DELETE' }),
};
