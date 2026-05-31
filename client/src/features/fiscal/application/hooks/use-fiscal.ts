'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fiscalApiHttp } from '../../infrastructure/api/fiscal.api.http';
import type {
  CreateFiscalSequenceInput,
  FiscalDocAppliesTo,
  IssueStandaloneDocumentInput,
  ListFiscalDocumentsParams,
  RenewFiscalSequenceInput,
} from '../../domain/types';

export const fiscalKey = {
  all: ['fiscal'] as const,
  docTypes: (params: { activeOnly?: boolean; appliesTo?: FiscalDocAppliesTo } = {}) =>
    ['fiscal', 'doc-types', params] as const,
  sequences: (params: { docType?: string; activeOnly?: boolean } = {}) =>
    ['fiscal', 'sequences', params] as const,
  documents: (params: ListFiscalDocumentsParams = {}) =>
    ['fiscal', 'documents', params] as const,
};

export function useFiscalDocTypes(params: {
  activeOnly?: boolean;
  appliesTo?: FiscalDocAppliesTo;
} = {}) {
  return useQuery({
    queryKey: fiscalKey.docTypes(params),
    queryFn: () => fiscalApiHttp.listDocTypes(params),
  });
}

export function useToggleFiscalDocType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      fiscalApiHttp.toggleDocType(code, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: fiscalKey.all }),
  });
}

export function useFiscalSequences(params: {
  docType?: string;
  activeOnly?: boolean;
} = {}) {
  return useQuery({
    queryKey: fiscalKey.sequences(params),
    queryFn: () => fiscalApiHttp.listSequences(params),
  });
}

export function useCreateFiscalSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFiscalSequenceInput) => fiscalApiHttp.createSequence(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: fiscalKey.all }),
  });
}

export function useRenewFiscalSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, input }: { docType: string; input: RenewFiscalSequenceInput }) =>
      fiscalApiHttp.renewSequence(docType, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: fiscalKey.all }),
  });
}

export function useFiscalDocuments(params: ListFiscalDocumentsParams = {}) {
  return useQuery({
    queryKey: fiscalKey.documents(params),
    queryFn: () => fiscalApiHttp.listDocuments(params),
  });
}

/**
 * Preview del 607 para un rango [from..to]. La descarga TXT se hace con
 * `fiscalApiHttp.download607Txt(from, to)` directamente (no es un hook).
 */
export function useFiscal607(params: {
  from: string;
  to: string;
  branchId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['fiscal', 'reports', '607', params.from, params.to, params.branchId ?? null] as const,
    queryFn: () => fiscalApiHttp.get607(params.from, params.to, params.branchId),
    enabled: params.enabled ?? !!(params.from && params.to),
  });
}

export function useFiscal606(params: {
  from: string;
  to: string;
  branchId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['fiscal', 'reports', '606', params.from, params.to, params.branchId ?? null] as const,
    queryFn: () => fiscalApiHttp.get606(params.from, params.to, params.branchId),
    enabled: params.enabled ?? !!(params.from && params.to),
  });
}

export function useFiscal608(params: {
  from: string;
  to: string;
  branchId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['fiscal', 'reports', '608', params.from, params.to, params.branchId ?? null] as const,
    queryFn: () => fiscalApiHttp.get608(params.from, params.to, params.branchId),
    enabled: params.enabled ?? !!(params.from && params.to),
  });
}

/** Anula un comprobante; invalida documentos y reportes fiscales. */
export function useVoidDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; voidType: string }) =>
      fiscalApiHttp.voidDocument(input.id, input.voidType),
    onSuccess: () => qc.invalidateQueries({ queryKey: fiscalKey.all }),
  });
}

/**
 * Emite un comprobante standalone (E41/E43/B11/B13).
 * Invalida todos los queries `fiscal.*` para refrescar listas y reportes.
 */
export function useIssueStandaloneDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueStandaloneDocumentInput) =>
      fiscalApiHttp.issueStandaloneDocument(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: fiscalKey.all }),
  });
}
