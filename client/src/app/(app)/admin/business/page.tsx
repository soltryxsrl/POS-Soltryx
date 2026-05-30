'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Building2, Save } from 'lucide-react';
import {
  useBusinessInfo,
  useUpdateBusinessInfo,
} from '@/features/config/application/hooks/use-business-info';
import type { UpdateBusinessInput } from '@/features/config/domain/types';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

const EMPTY: UpdateBusinessInput = {
  name: '',
  legalName: '',
  rnc: '',
  address: '',
  phone: '',
  footerNote: '',
  allowNegativeStock: false,
  priceIncludesTax: false,
  tipEnabled: false,
  tipDefaultPct: '10.00',
  taxRegime: 'ORDINARIO',
  discountOverrideThresholdPct: '15.00',
  logoUrl: null,
  tagline: null,
};

export default function BusinessSettingsPage() {
  const { user } = useAuth();
  const canEdit = !!user && user.permissions.includes('settings.update');
  const query = useBusinessInfo();
  const update = useUpdateBusinessInfo();
  const [form, setForm] = useState<UpdateBusinessInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Inicializa el form con los valores que vinieron del server cuando llegan,
  // pero no pisa lo que el usuario ya tecleó (savedAt nulo = nunca guardado todavía).
  useEffect(() => {
    if (!query.data) return;
    setForm(query.data);
  }, [query.data]);

  const onChange =
    (key: keyof UpdateBusinessInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [key]: e.target.value }));

  const onToggle =
    (key: 'allowNegativeStock' | 'tipEnabled' | 'priceIncludesTax') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [key]: e.target.checked }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length === 0) {
      setError('El nombre del negocio es obligatorio.');
      return;
    }
    try {
      await update.mutateAsync(form);
      setSavedAt(Date.now());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (query.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando configuración...</div>;
  }
  if (query.isError) {
    return (
      <div className="space-y-2">
        <p className="text-destructive">{getErrorMessage(query.error)}</p>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader
        title="Datos del negocio"
        description="Aparecen en la cabecera y pie de cada recibo impreso o exportado a PDF."
      />

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-from">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">Cabecera del recibo</div>
            <p className="text-xs text-muted-foreground">
              Estos datos se imprimen en cada recibo nuevo y al reimprimir.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre comercial" required>
            <Input
              value={form.name}
              onChange={onChange('name')}
              maxLength={180}
              disabled={!canEdit}
              placeholder="Ej: Colmado El Buen Precio"
            />
          </FormField>

          <FormField label="Razón social">
            <Input
              value={form.legalName}
              onChange={onChange('legalName')}
              maxLength={180}
              disabled={!canEdit}
              placeholder="Ej: Comercial Buen Precio SRL"
            />
          </FormField>

          <FormField label="RNC / Cédula">
            <Input
              value={form.rnc}
              onChange={onChange('rnc')}
              maxLength={32}
              disabled={!canEdit}
              placeholder="131-12345-6"
            />
          </FormField>

          <FormField label="Teléfono">
            <Input
              value={form.phone}
              onChange={onChange('phone')}
              maxLength={64}
              disabled={!canEdit}
              placeholder="809-555-1234"
            />
          </FormField>

          <FormField label="Dirección" className="sm:col-span-2">
            <Input
              value={form.address}
              onChange={onChange('address')}
              maxLength={255}
              disabled={!canEdit}
              placeholder="Calle Principal #123, Sector, Ciudad"
            />
          </FormField>

          <FormField label="Mensaje al pie del recibo" className="sm:col-span-2">
            <Input
              value={form.footerNote}
              onChange={onChange('footerNote')}
              maxLength={255}
              disabled={!canEdit}
              placeholder="*** Gracias por su compra ***"
            />
          </FormField>

          <FormField
            label="Eslogan / tagline"
            className="sm:col-span-2"
            hint="Aparece bajo el nombre del negocio en cada recibo."
          >
            <Input
              value={form.tagline ?? ''}
              onChange={(e) =>
                setForm((s) => ({ ...s, tagline: e.target.value || null }))
              }
              maxLength={180}
              disabled={!canEdit}
              placeholder="Soluciones integrales, resultados excepcionales"
            />
          </FormField>

          <FormField
            label="Logo del negocio (URL, opcional)"
            className="sm:col-span-2"
            hint="Pega una URL pública (Cloudinary, Imgur, CDN). Se imprime arriba del nombre."
          >
            <div className="flex items-start gap-3">
              <Input
                value={form.logoUrl ?? ''}
                onChange={(e) =>
                  setForm((s) => ({ ...s, logoUrl: e.target.value || null }))
                }
                maxLength={500}
                disabled={!canEdit}
                placeholder="https://..."
                inputMode="url"
                className="flex-1"
              />
              {form.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="h-14 w-14 flex-shrink-0 rounded-md border border-border object-contain bg-white p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-[10px] text-muted-foreground">
                  Sin logo
                </div>
              )}
            </div>
          </FormField>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="text-sm font-semibold text-foreground">Políticas operativas</div>

          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <input
              type="checkbox"
              checked={form.priceIncludesTax}
              onChange={onToggle('priceIncludesTax')}
              disabled={!canEdit}
              className="mt-0.5 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">
                Precios con ITBIS incluido
              </div>
              <p className="text-xs text-muted-foreground">
                Norma del retail RD: el precio que registras y muestra el POS YA
                incluye el ITBIS. El sistema lo desglosa (back-calcula) en el
                recibo en vez de sumarlo encima. Si está apagado, el ITBIS se
                agrega sobre el precio (tax-exclusive).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <input
              type="checkbox"
              checked={form.allowNegativeStock}
              onChange={onToggle('allowNegativeStock')}
              disabled={!canEdit}
              className="mt-0.5 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">Permitir stock negativo</div>
              <p className="text-xs text-muted-foreground">
                Cuando esté activo, el POS dejará vender aunque el stock calculado
                baje de cero (útil para colmados donde el inventario es impreciso).
                Si está apagado, ventas sin stock se bloquean.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <input
              type="checkbox"
              checked={form.tipEnabled}
              onChange={onToggle('tipEnabled')}
              disabled={!canEdit}
              className="mt-0.5 rounded border-border"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Activar propina al cobrar</div>
              <p className="text-xs text-muted-foreground">
                Muestra una sección de propina en el modal de cobro. Útil para
                consumo en establecimiento (Ley 16-92 art. 228 — 10% legal RD).
              </p>
              {form.tipEnabled && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">% sugerido:</span>
                  <Input
                    value={form.tipDefaultPct}
                    onChange={onChange('tipDefaultPct')}
                    pattern="^\d+(\.\d{1,2})?$"
                    inputMode="decimal"
                    disabled={!canEdit}
                    className="w-20"
                  />
                </div>
              )}
            </div>
          </label>

          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium">
              Umbral de descuento que requiere autorización
            </div>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">
              Si el descuento aplicado a una venta supera este porcentaje del
              subtotal, el cajero necesita credenciales de un usuario con el
              permiso <code className="font-mono">sales.discount.override</code>.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={form.discountOverrideThresholdPct}
                onChange={onChange('discountOverrideThresholdPct')}
                pattern="^\d+(\.\d{1,2})?$"
                inputMode="decimal"
                disabled={!canEdit}
                className="w-24 text-right"
              />
              <span className="text-sm text-muted-foreground">% del subtotal</span>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium">Régimen tributario DGII</div>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">
              Define si declaras 606/607 mensual. RST (Régimen Simplificado de
              Tributación) no requiere esos reportes — la sección &quot;Impuestos&quot; se
              oculta parcialmente cuando RST está activo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['ORDINARIO', 'RST'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, taxRegime: r }))}
                  disabled={!canEdit}
                  className={
                    'rounded-xl border-2 px-3 py-2 text-left text-sm transition ' +
                    (form.taxRegime === r
                      ? 'border-brand-from bg-brand-tint'
                      : 'border-border bg-card hover:border-foreground/20')
                  }
                >
                  <div className="font-medium">{r}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r === 'ORDINARIO'
                      ? 'Contribuyente normal — declara 606/607'
                      : 'Pequeños contribuyentes — NO declara'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        {savedAt && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            Cambios guardados. El siguiente recibo usará los nuevos datos.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            type="submit"
            disabled={!canEdit || update.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {update.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        {!canEdit && (
          <p className="text-xs text-muted-foreground">
            Solo usuarios con permiso <code>settings.update</code> pueden editar.
          </p>
        )}
      </form>
    </div>
  );
}
