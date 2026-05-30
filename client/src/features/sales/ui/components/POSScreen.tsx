'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Clock, Keyboard, Lock, Tag } from 'lucide-react';
import { useActiveSessionMine } from '@/features/cash/application/hooks/use-cash';
import { DrawerButton } from '@/features/printing/ui/DrawerButton';
import { CustomerPicker } from '@/features/customers/ui/components/CustomerPicker';
import { useParkedCarts } from '@/features/parked-carts/application/hooks/use-parked-carts';
import { ParkCartDialog } from '@/features/parked-carts/ui/components/ParkCartDialog';
import { ParkedCartsDrawer } from '@/features/parked-carts/ui/components/ParkedCartsDrawer';
import type { Product } from '@/features/products/domain/types';
import { Button } from '@/shared/ui/controls/Button';
import { useCartStore } from '../../application/stores/cart.store';
import { useRecentProductsStore } from '../../application/stores/recent-products.store';
import { Cart } from './Cart';
import { CategoryChips } from './CategoryChips';
import { OpenItemDialog } from './OpenItemDialog';
import { PaymentModal } from './PaymentModal';
import { POSHeader } from './POSHeader';
import { ProductSearch } from './ProductSearch';
import { RecentProducts } from './RecentProducts';
import { VariantPicker } from './VariantPicker';

export function POSScreen() {
  const activeSession = useActiveSessionMine();
  const addItem = useCartStore((s) => s.addItem);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const cartHasItems = useCartStore((s) => s.items.length > 0);
  const pushRecent = useRecentProductsStore((s) => s.pushRecent);
  const [showPay, setShowPay] = useState(false);
  const [showPark, setShowPark] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showOpenItem, setShowOpenItem] = useState(false);
  const [pickingVariantFor, setPickingVariantFor] = useState<Product | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const parked = useParkedCarts(activeSession.data?.id);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atajos de teclado globales del POS.
  useEffect(() => {
    if (!activeSession.data) return;
    const onKey = (e: KeyboardEvent) => {
      // Si hay un modal abierto, dejamos que el modal/inputs manejen las teclas.
      const anyModalOpen = showPay || showPark || showDrawer || showCustomerPicker || showOpenItem || !!pickingVariantFor;
      const target = e.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // "/" enfoca búsqueda (solo si no estás tecleando ya en un input).
      if (e.key === '/' && !isTypingInField && !anyModalOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Las F-keys funcionan incluso desde dentro del input de búsqueda.
      if (anyModalOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        if (cartHasItems) setShowPay(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartHasItems) setShowPark(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        setShowCustomerPicker(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowDrawer(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowOpenItem(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    activeSession.data,
    cartHasItems,
    showPay,
    showPark,
    showDrawer,
    showCustomerPicker,
    showOpenItem,
    pickingVariantFor,
  ]);

  if (activeSession.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        Cargando estado de caja...
      </div>
    );
  }

  if (!activeSession.data) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-10 text-center shadow-sm shadow-brand-soft/40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/30">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Necesitas abrir caja
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No puedes procesar ventas sin un turno de caja activo.
        </p>
        <Link
          href="/cash"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-from/30 transition hover:shadow-md hover:brightness-105"
        >
          Ir a Caja
        </Link>
      </div>
    );
  }

  const handlePick = (p: Product) => {
    if (p.hasVariants) {
      setPickingVariantFor(p);
      return;
    }
    addItem({
      productId: p.id,
      variantId: null,
      variantName: null,
      productName: p.name,
      sku: p.sku,
      unitPrice: p.salePrice,
      taxRate: p.taxRate,
      soldByWeight: p.soldByWeight,
      quantity: 1,
    });
    pushRecent(p);
  };

  const parkedCount = parked.data?.length ?? 0;

  return (
    <div className="space-y-3">
      <POSHeader session={activeSession.data} />

      <div className="grid gap-3 lg:grid-cols-[1fr_400px]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CategoryChips selectedId={categoryId} onSelect={setCategoryId} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOpenItem(true)}
              className="flex-shrink-0"
              title="Venta de monto libre (F7)"
            >
              <Tag className="h-4 w-4" />
              Monto libre
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDrawer(true)}
              className="flex-shrink-0"
              title="Carritos en espera (F6)"
            >
              <Clock className="h-4 w-4" />
              En espera
              {parkedCount > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-r from-brand-from to-brand-to px-1.5 text-[10px] font-bold text-white">
                  {parkedCount}
                </span>
              )}
            </Button>
            <DrawerButton />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <RecentProducts onPick={handlePick} />
            <ProductSearch
              onPick={handlePick}
              categoryId={categoryId}
              inputRef={searchInputRef}
            />
          </div>

          <KeyboardHints />
        </div>

        <div className="lg:h-[calc(100vh-260px)]">
          <Cart
            onCheckout={() => setShowPay(true)}
            onPark={cartHasItems ? () => setShowPark(true) : undefined}
            onPickCustomer={() => setShowCustomerPicker(true)}
          />
        </div>
      </div>

      {showPay && (
        <PaymentModal
          cashSessionId={activeSession.data.id}
          onClose={() => setShowPay(false)}
        />
      )}
      {showPark && (
        <ParkCartDialog
          cashSessionId={activeSession.data.id}
          onClose={() => setShowPark(false)}
        />
      )}
      <ParkedCartsDrawer
        cashSessionId={activeSession.data.id}
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
      />
      {showCustomerPicker && (
        <CustomerPicker
          onPick={(c) =>
            setCustomer({
              id: c.id,
              fullName: c.fullName,
              document: c.document,
              documentType: c.documentType,
            })
          }
          onClear={() => setCustomer(null)}
          onClose={() => setShowCustomerPicker(false)}
        />
      )}
      {pickingVariantFor && (
        <VariantPicker
          product={pickingVariantFor}
          onPick={(v) => {
            addItem({
              productId: pickingVariantFor.id,
              variantId: v.id,
              variantName: v.name,
              productName: pickingVariantFor.name,
              sku: v.sku,
              unitPrice: v.salePrice ?? pickingVariantFor.salePrice,
              taxRate: pickingVariantFor.taxRate,
              soldByWeight: pickingVariantFor.soldByWeight,
              quantity: 1,
            });
            pushRecent(pickingVariantFor);
          }}
          onClose={() => setPickingVariantFor(null)}
        />
      )}
      {showOpenItem && <OpenItemDialog onClose={() => setShowOpenItem(false)} />}
    </div>
  );
}

function KeyboardHints() {
  return (
    <div className="hidden items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground md:flex">
      <Keyboard className="h-3.5 w-3.5 flex-shrink-0" />
      <HintKey k="F2" label="Cobrar" />
      <HintKey k="F4" label="Estacionar" />
      <HintKey k="F6" label="En espera" />
      <HintKey k="F7" label="Monto libre" />
      <HintKey k="F9" label="Cliente" />
      <HintKey k="/" label="Buscar" />
      <HintKey k="Esc" label="Cerrar" />
    </div>
  );
}

function HintKey({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-sm">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
