export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}
