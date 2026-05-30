'use client';

import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useProduct } from '../../application/hooks/use-products';
import { ProductForm } from './ProductForm';

interface Props {
  productId?: string | null;
  onClose: () => void;
}

export function ProductFormDialog({ productId, onClose }: Props) {
  const product = useProduct(productId ?? undefined);
  const isEdit = !!productId;
  const loadingEdit = isEdit && product.isLoading;

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={isEdit ? (product.data?.name ?? 'Editar producto') : 'Nuevo producto'}
      size="xl"
    >
      {loadingEdit ? (
        <div className="py-12 text-center text-muted-foreground">
          Cargando producto...
        </div>
      ) : isEdit && !product.data ? (
        <div className="py-6 text-center text-destructive">
          No se pudo cargar el producto.
        </div>
      ) : (
        <ProductForm
          product={isEdit ? product.data : undefined}
          onSuccess={onClose}
          onCancel={onClose}
        />
      )}
    </MaintenanceShell>
  );
}
