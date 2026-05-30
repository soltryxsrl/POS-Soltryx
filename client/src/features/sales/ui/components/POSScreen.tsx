'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useActiveSessionMine } from '@/features/cash/application/hooks/use-cash';
import type { Product } from '@/features/products/domain/types';
import { useCartStore } from '../../application/stores/cart.store';
import { Cart } from './Cart';
import { PaymentModal } from './PaymentModal';
import { ProductSearch } from './ProductSearch';

export function POSScreen() {
  const activeSession = useActiveSessionMine();
  const addItem = useCartStore((s) => s.addItem);
  const [showPay, setShowPay] = useState(false);

  if (activeSession.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        Cargando estado de caja...
      </div>
    );
  }

  if (!activeSession.data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold">Necesitas abrir caja</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Para registrar ventas debes tener una sesión de caja abierta.
        </p>
        <Link
          href="/dashboard/cash"
          className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Ir a Caja
        </Link>
      </div>
    );
  }

  const handlePick = (p: Product) => {
    addItem({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      unitPrice: p.salePrice,
      taxRate: p.taxRate,
      quantity: 1,
    });
  };

  return (
    <div className="grid h-[calc(100vh-180px)] gap-4 lg:grid-cols-[1fr_400px]">
      <div className="overflow-y-auto">
        <ProductSearch onPick={handlePick} />
      </div>
      <div className="overflow-hidden">
        <Cart onCheckout={() => setShowPay(true)} />
      </div>

      {showPay && (
        <PaymentModal
          cashSessionId={activeSession.data.id}
          onClose={() => setShowPay(false)}
        />
      )}
    </div>
  );
}
