import { getAccessTokenFromStore } from '@/features/auth/application/stores/auth.store';
import { env } from '@/shared/lib/env';
import { http } from '@/shared/lib/http-client';
import type {
  CreateFiscalSequenceInput,
  Fiscal606Response,
  Fiscal607Response,
  FiscalDocAppliesTo,
  FiscalDocType,
  FiscalDocumentListItem,
  FiscalDocumentsListResponse,
  FiscalSequence,
  IssueStandaloneDocumentInput,
  ListFiscalDocumentsParams,
  RenewFiscalSequenceInput,
} from '../../domain/types';

export const fiscalApiHttp = {
  // Tipos
  listDocTypes: (params: { activeOnly?: boolean; appliesTo?: FiscalDocAppliesTo } = {}) =>
    http<FiscalDocType[]>('/fiscal/doc-types', {
      searchParams: {
        ...(params.activeOnly ? { activeOnly: 'true' } : {}),
        ...(params.appliesTo ? { appliesTo: params.appliesTo } : {}),
      },
    }),

  toggleDocType: (code: string, isActive: boolean) =>
    http<FiscalDocType>(`/fiscal/doc-types/${code}`, {
      method: 'PATCH',
      body: { isActive },
    }),

  // Secuencias
  listSequences: (params: { docType?: string; activeOnly?: boolean } = {}) =>
    http<FiscalSequence[]>('/fiscal/sequences', {
      searchParams: {
        ...(params.docType ? { docType: params.docType } : {}),
        ...(params.activeOnly ? { activeOnly: 'true' } : {}),
      },
    }),

  createSequence: (input: CreateFiscalSequenceInput) =>
    http<FiscalSequence>('/fiscal/sequences', { method: 'POST', body: input }),

  renewSequence: (docType: string, input: RenewFiscalSequenceInput) =>
    http<FiscalSequence>(`/fiscal/sequences/${docType}/renew`, {
      method: 'POST',
      body: input,
    }),

  /** Emite standalone (E41/E43/B11/B13). Devuelve la entity creada. */
  issueStandaloneDocument: (input: IssueStandaloneDocumentInput) =>
    http<FiscalDocumentListItem>('/fiscal/documents/standalone', {
      method: 'POST',
      body: input,
    }),

  // Documentos fiscales emitidos
  listDocuments: (params: ListFiscalDocumentsParams = {}) =>
    http<FiscalDocumentsListResponse>('/fiscal/documents', {
      searchParams: {
        ...(params.q ? { q: params.q } : {}),
        ...(params.docType ? { docType: params.docType } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.from ? { from: params.from } : {}),
        ...(params.to ? { to: params.to } : {}),
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
        ...(params.offset !== undefined ? { offset: params.offset } : {}),
      },
    }),

  // Reporte 607 (ventas con NCF a DGII)
  get607: (from: string, to: string) =>
    http<Fiscal607Response>('/fiscal/reports/607', {
      searchParams: { from, to },
    }),

  download607Txt: async (from: string, to: string): Promise<void> => {
    await downloadReportTxt('607', from, to);
  },

  // Reporte 606 (compras con NCF de proveedores)
  get606: (from: string, to: string) =>
    http<Fiscal606Response>('/fiscal/reports/606', {
      searchParams: { from, to },
    }),

  download606Txt: async (from: string, to: string): Promise<void> => {
    await downloadReportTxt('606', from, to);
  },
};

/**
 * Descarga genérica del TXT pipe-delimited DGII (606 o 607) disparando
 * el navegador. No usa `http()` porque la respuesta es texto crudo.
 */
async function downloadReportTxt(
  kind: '606' | '607',
  from: string,
  to: string,
): Promise<void> {
  const token = getAccessTokenFromStore();
  const url = `${env.apiUrl.replace(
    /\/$/,
    '',
  )}/api/fiscal/reports/${kind}?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}&format=txt`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar el ${kind} (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const fileName = `${kind}_${from.replace(/-/g, '')}_${to.replace(/-/g, '')}.txt`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
