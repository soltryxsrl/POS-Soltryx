'use client';

import { useState, type ReactNode } from 'react';
import { Check, Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import type { Sale } from '../../domain/types';

interface Props {
  sale: Sale;
  /** Nombre del negocio para el mensaje pre-compuesto. */
  businessName?: string;
  /** Teléfono pre-rellenado (ej: del cliente asociado a la venta). */
  defaultPhone?: string;
  /** Email pre-rellenado. */
  defaultEmail?: string;
  onClose: () => void;
}

/**
 * Comparte el recibo de una venta sin requerir que el destinatario tenga login.
 *
 * Mecanismos soportados:
 *   - Copiar el link público (`/r/{token}`) al portapapeles
 *   - Compartir por WhatsApp (abre `wa.me/<phone>?text=`)
 *   - Compartir por email (abre `mailto:` con asunto + cuerpo + link)
 *   - Web Share API (si el navegador la expone — Android/iOS)
 *
 * Todos usan el mismo link público; el customer puede ver/imprimir desde su
 * dispositivo en `/r/{publicToken}`.
 */
export function ShareReceiptDialog({
  sale,
  businessName,
  defaultPhone,
  defaultEmail,
  onClose,
}: Props) {
  const link = buildPublicLink(sale.publicToken);
  const messagePlain = buildMessage(sale, link, businessName);
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const onWhatsApp = () => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messagePlain)}`
      : `https://wa.me/?text=${encodeURIComponent(messagePlain)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onEmail = () => {
    const subject = `Recibo ${sale.saleNumber}${businessName ? ` — ${businessName}` : ''}`;
    const body = messagePlain;
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const onNativeShare = async () => {
    try {
      await navigator.share({
        title: `Recibo ${sale.saleNumber}`,
        text: messagePlain,
        url: link,
      });
    } catch {
      // user cancelled, ignore
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title={`Compartir recibo ${sale.saleNumber}`} size="md">
      <div className="space-y-5">
        <div className="rounded-2xl border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Link público
          </div>
          <div className="mt-1 flex items-center gap-2">
            <code className="block flex-1 truncate rounded-md border bg-background px-2 py-1.5 font-mono text-xs">
              {link}
            </code>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cualquiera con este link puede ver e imprimir el recibo. No se
            puede adivinar (UUID v4) pero compártelo solo con el cliente.
          </p>
        </div>

        <div className="space-y-2">
          <Section
            icon={<MessageCircle className="h-4 w-4 text-emerald-600" />}
            title="WhatsApp"
          >
            <div className="flex items-center gap-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Número (opcional, ej: 809-555-1234)"
                inputMode="tel"
                className="flex-1"
              />
              <Button onClick={onWhatsApp}>Enviar</Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Si dejas el número vacío, abre WhatsApp para que elijas el contacto.
            </p>
          </Section>

          <Section icon={<Mail className="h-4 w-4 text-blue-600" />} title="Email">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@correo.com"
                className="flex-1"
              />
              <Button variant="outline" onClick={onEmail} disabled={!email.trim()}>
                Enviar
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Abre tu cliente de email con asunto, cuerpo y el link ya escrito.
            </p>
          </Section>

          {canNativeShare && (
            <Section
              icon={<Share2 className="h-4 w-4 text-violet-600" />}
              title="Otras apps"
            >
              <Button variant="outline" onClick={onNativeShare} className="w-full">
                Compartir con el sistema...
              </Button>
            </Section>
          )}
        </div>

        <FormFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </FormFooter>
      </div>
    </MaintenanceShell>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function buildPublicLink(token: string): string {
  if (typeof window === 'undefined') return `/r/${token}`;
  return `${window.location.origin}/r/${token}`;
}

function buildMessage(sale: Sale, link: string, businessName?: string): string {
  const biz = businessName ?? 'Comercio';
  return [
    `Hola, te comparto el recibo de tu compra en ${biz}.`,
    `Número: ${sale.saleNumber}`,
    `Total: ${formatMoney(sale.total)}`,
    ``,
    `Ver detalle: ${link}`,
    ``,
    `Gracias por tu compra.`,
  ].join('\n');
}
