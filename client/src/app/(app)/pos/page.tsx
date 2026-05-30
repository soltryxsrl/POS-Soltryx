'use client';

import { POSScreen } from '@/features/sales/ui/components/POSScreen';

/**
 * El POS ocupa toda el área de trabajo: el encabezado operativo (cajero, caja,
 * turno, ventas) lo da POSHeader, así que omitimos el breadcrumb + título para
 * maximizar el espacio de productos y carrito.
 */
export default function PosPage() {
  return <POSScreen />;
}
