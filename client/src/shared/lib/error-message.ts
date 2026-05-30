import { HttpClientError } from './http-client';

export function getErrorMessage(err: unknown): string {
  if (err instanceof HttpClientError) {
    return err.apiError?.message ?? `Error ${err.status}`;
  }
  if (err instanceof Error) return err.message;
  return 'Error inesperado';
}
