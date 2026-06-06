'use client';

import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { formatQuantity } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useBranches } from '@/features/branches/application/hooks/use-branches';
import { ProductCombobox } from '@/features/products/ui/components/ProductCombobox';
import { useCreateStockTransfer } from '../../application/hooks/use-stock-transfers';

interface Line {
  productId: string;
  name: string;
  sku: string;
  stock: string;
  quantity: string;
}

interface Props {
  /** Sucursal origen activa — se excluye de los destinos posibles. */
  active: string | null;
  onClose: () => void;
}

export function TransferFormDialog({ active, onClose }: Props) {
  const branches = useBranches({ isActive: 'true', limit: 100 });
  const create = useCreateStockTransfer();

  const [destBranchId, setDestBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);

  const destOptions = (branches.data?.items ?? []).filter((b) => b.id !== active);

  const addLine = (p: { id: string; name: string; sku: string; stock: string }) => {
    if (lines.some((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, { productId: p.id, name: p.name, sku: p.sku, stock: p.stock, quantity: '1' }]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!destBranchId) return setError('Selecciona la sucursal destino.');
    if (lines.length === 0) return setError('Agrega al menos un producto.');
    try {
      await create.mutateAsync({
        destBranchId,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Nueva transferencia" size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Enviar a sucursal" required>
            <Select value={destBranchId} onChange={(e) => setDestBranchId(e.target.value)} className="w-56" required>
              <option value="" disabled>Selecciona…</option>
              {destOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Buscar producto (de esta sucursal)" className="min-w-64 flex-1">
            <ProductCombobox
              type="simple"
              excludeIds={lines.map((l) => l.productId)}
              onSelect={addLine}
              placeholder="Nombre o SKU…"
            />
          </FormField>
        </div>

        {lines.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.productId} className="border-b last:border-0">
                  <td className="px-3 py-2">{l.name} <span className="text-xs text-muted-foreground">{l.sku}</span></td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatQuantity(l.stock)}</td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      inputMode="decimal"
                      value={l.quantity}
                      onChange={(e) =>
                        setLines((prev) => prev.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))
                      }
                      className="w-24 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} title="Quitar">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <FormField label="Notas">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </FormField>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending || !destBranchId || lines.length === 0}>
            {create.isPending ? 'Enviando…' : 'Enviar transferencia'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
