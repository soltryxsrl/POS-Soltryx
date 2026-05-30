import type {
  CreateProductInput,
  ListProductsParams,
  Product,
  ProductListResponse,
  UpdateProductInput,
} from './types';

export interface ProductsApi {
  list(params?: ListProductsParams): Promise<ProductListResponse>;
  findById(id: string): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  remove(id: string): Promise<void>;
}
