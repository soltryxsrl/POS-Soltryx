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
} from './types';

export interface ProductsApi {
  list(params?: ListProductsParams): Promise<ProductListResponse>;
  findById(id: string): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  remove(id: string): Promise<void>;
  listKitComponents(id: string): Promise<KitComponent[]>;
  setKitComponents(id: string, input: SetKitComponentsInput): Promise<KitComponent[]>;
  listVariants(id: string): Promise<ProductVariant[]>;
  createVariant(id: string, input: CreateVariantInput): Promise<ProductVariant>;
  updateVariant(
    id: string,
    variantId: string,
    input: UpdateVariantInput,
  ): Promise<ProductVariant>;
  deleteVariant(id: string, variantId: string): Promise<void>;
}
