/**
 * Utilidades de exportación CSV (cliente). Genera un CSV con BOM UTF-8 para que
 * Excel respete los acentos, y dispara la descarga en el navegador.
 */

type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
  const s = value == null ? '' : String(value);
  // Entrecomillar si contiene separadores, comillas o saltos de línea.
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serializa filas (encabezado + datos) a una cadena CSV con BOM. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(','));
  return '﻿' + lines.join('\r\n');
}

/** Construye el CSV y dispara la descarga con el nombre dado. */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const blob = new Blob([toCsv(headers, rows)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
