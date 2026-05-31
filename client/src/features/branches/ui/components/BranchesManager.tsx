'use client';

import { useState, type FormEvent } from 'react';
import { Building2, Copy, Pencil, Plus, Power, Wallet, X } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import {
  useCashRegisters,
  useCreateCashRegister,
} from '@/features/cash/application/hooks/use-cash';
import {
  useBranches,
  useCloneCatalog,
  useCreateBranch,
  useUpdateBranch,
} from '../../application/hooks/use-branches';
import { useActiveBranchStore } from '../../application/stores/active-branch.store';
import type { Branch, CloneCatalogResult } from '../../domain/types';

/** Deriva un código interno desde el nombre (mayúsculas, sin acentos, _). */
function codeFromName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
  if (!base) return 'SUC';
  return /^[A-Z]/.test(base) ? base : `S_${base}`;
}

export function BranchesManager() {
  const canCreate = useHasPermission('branches.create');
  const canManage = useHasPermission('branches.update');
  const branches = useBranches({ limit: 100 });
  const create = useCreateBranch();
  const [name, setName] = useState('');
  const [rnc, setRnc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        code: codeFromName(name),
        name: name.trim(),
        rnc: rnc.trim() || undefined,
      });
      setName('');
      setRnc('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const items = branches.data?.items ?? [];

  return (
    <div className="space-y-4">
      {canCreate && (
        <form
          onSubmit={onCreate}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <FormField label="Nueva sucursal" required>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sucursal Norte"
              className="w-56"
            />
          </FormField>
          <FormField label="RNC (opcional)">
            <Input
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              placeholder="RNC"
              className="w-40"
            />
          </FormField>
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            <Plus className="h-4 w-4" />
            {create.isPending ? 'Creando...' : 'Crear sucursal'}
          </Button>
          {error && <p className="w-full text-sm text-destructive">{error}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Sucursal</th>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">RNC</th>
              <th className="px-4 py-2.5 text-right">Activa</th>
              {canManage && <th className="px-4 py-2.5 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {branches.isLoading && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {items.map((b) => (
              <BranchRow key={b.id} branch={b} canManage={canManage} />
            ))}
          </tbody>
        </table>
      </div>

      <CloneCatalogSection />

      <CashRegistersSection />
    </div>
  );
}

/** Fila de sucursal con edición inline (nombre/RNC/dirección/teléfono) y activar/desactivar. */
function BranchRow({ branch, canManage }: { branch: Branch; canManage: boolean }) {
  const update = useUpdateBranch(branch.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(branch.name);
  const [rnc, setRnc] = useState(branch.rnc ?? '');
  const [address, setAddress] = useState(branch.address ?? '');
  const [phone, setPhone] = useState(branch.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setName(branch.name);
    setRnc(branch.rnc ?? '');
    setAddress(branch.address ?? '');
    setPhone(branch.phone ?? '');
    setError(null);
    setEditing(true);
  };

  const onSave = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        rnc: rnc.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const onToggleActive = async () => {
    setError(null);
    try {
      await update.mutateAsync({ isActive: !branch.isActive });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (editing) {
    return (
      <tr className="bg-muted/20">
        <td className="px-4 py-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        </td>
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{branch.code}</td>
        <td className="px-4 py-3">
          <Input value={rnc} onChange={(e) => setRnc(e.target.value)} placeholder="RNC" className="w-32" />
        </td>
        <td className="px-4 py-3" colSpan={2}>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección" className="w-40" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="w-32" />
            <Button type="button" onClick={onSave} disabled={update.isPending || !name.trim()}>
              {update.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="mt-1 text-right text-xs text-destructive">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <Building2 className="h-4 w-4 text-brand-from" />
          {branch.name}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{branch.code}</td>
      <td className="px-4 py-3 text-muted-foreground">{branch.rnc ?? '—'}</td>
      <td className="px-4 py-3 text-right">
        <span
          className={
            branch.isActive
              ? 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
          }
        >
          {branch.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <Button type="button" variant="ghost" onClick={startEdit} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onToggleActive}
              disabled={update.isPending}
              title={branch.isActive ? 'Desactivar' : 'Activar'}
              className={branch.isActive ? 'text-amber-600' : 'text-emerald-600'}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="mt-1 text-right text-xs text-destructive">{error}</p>}
        </td>
      )}
    </tr>
  );
}

/**
 * Copia el catálogo (categorías + productos simples) de OTRA sucursal a la
 * sucursal activa. Útil para arrancar una sucursal nueva, que nace vacía bajo el
 * modelo de catálogo separado. Productos con variantes/kits se omiten.
 */
function CloneCatalogSection() {
  const { user } = useAuth();
  const canManage = !!user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER');
  const branches = useBranches({ limit: 100 });
  const clone = useCloneCatalog();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloneCatalogResult | null>(null);

  if (!canManage) return null;

  const currentId = activeBranchId ?? user?.branchId ?? null;
  const activeName =
    branches.data?.items.find((b) => b.id === currentId)?.name ?? 'actual';
  const sources = (branches.data?.items ?? []).filter((b) => b.id !== currentId);

  const onClone = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const res = await clone.mutateAsync(sourceId);
      setResult(res);
      setSourceId('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Copy className="h-4 w-4 text-brand-from" />
        Copiar catálogo a la sucursal activa:{' '}
        <span className="text-brand-from">{activeName}</span>
      </h2>

      <form
        onSubmit={onClone}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <FormField label="Copiar desde" required>
          <Select
            required
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-56"
          >
            <option value="" disabled>
              Selecciona una sucursal…
            </option>
            {sources.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" disabled={clone.isPending || !sourceId}>
          <Copy className="h-4 w-4" />
          {clone.isPending ? 'Copiando...' : 'Copiar catálogo'}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Copia categorías, productos (simples, con variantes y kits), variantes,
          códigos de barras y recetas de kit, con stock en 0.
        </p>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        {result && (
          <div className="w-full space-y-1">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Listo: {result.categoriesCreated} categoría(s), {result.productsCreated}{' '}
              producto(s)
              {result.variantsCreated > 0 ? `, ${result.variantsCreated} variante(s)` : ''}
              {result.kitComponentsCreated > 0
                ? `, ${result.kitComponentsCreated} componente(s) de kit`
                : ''}{' '}
              copiados
              {result.skipped > 0 ? `, ${result.skipped} producto(s) ya existente(s)` : ''}.
            </p>
            {(result.barcodesSkipped > 0 || result.kitComponentsSkipped > 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Aviso:
                {result.barcodesSkipped > 0
                  ? ` ${result.barcodesSkipped} código(s) de barras se omitieron (ya existían en destino).`
                  : ''}
                {result.kitComponentsSkipped > 0
                  ? ` ${result.kitComponentsSkipped} componente(s) de kit no se pudieron copiar (producto borrado en origen).`
                  : ''}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

/**
 * Cajas registradoras de la SUCURSAL ACTIVA (la del selector). Para operar una
 * sucursal nueva hace falta al menos una caja: sin caja no se puede abrir turno.
 */
function CashRegistersSection() {
  const { user } = useAuth();
  const canManage = !!user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER');
  const registers = useCashRegisters();
  const createReg = useCreateCashRegister();
  const branches = useBranches({ limit: 100 });
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const [regName, setRegName] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const currentId = activeBranchId ?? user?.branchId ?? null;
  const activeName =
    branches.data?.items.find((b) => b.id === currentId)?.name ?? 'actual';

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setRegError(null);
    try {
      await createReg.mutateAsync({ name: regName.trim() });
      setRegName('');
    } catch (err) {
      setRegError(getErrorMessage(err));
    }
  };

  const items = registers.data ?? [];

  return (
    <div className="space-y-3 pt-2">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Wallet className="h-4 w-4 text-brand-from" />
        Cajas de la sucursal activa:{' '}
        <span className="text-brand-from">{activeName}</span>
      </h2>

      {canManage && (
        <form
          onSubmit={onCreate}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <FormField label="Nueva caja" required>
            <Input
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Ej: Caja 2"
              className="w-56"
            />
          </FormField>
          <Button type="submit" disabled={createReg.isPending || !regName.trim()}>
            <Plus className="h-4 w-4" />
            {createReg.isPending ? 'Creando...' : 'Crear caja'}
          </Button>
          {regError && <p className="w-full text-sm text-destructive">{regError}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Caja</th>
              <th className="px-4 py-2.5">Código</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registers.isLoading && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {!registers.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Esta sucursal no tiene cajas.{canManage ? ' Crea una arriba.' : ''}
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {r.code}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
