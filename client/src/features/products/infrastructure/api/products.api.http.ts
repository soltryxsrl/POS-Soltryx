import { http } from '@/shared/lib/http-client';
import type { ProductsApi } from '../../domain/ports';
import type {
  CreateProductInput,
  ListProductsParams,
  Product,
  ProductListResponse,
  UpdateProductInput,
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
};
