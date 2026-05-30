/**
 * Imprime una factura en formato Carta (8.5 x 11). Misma técnica del
 * `printReceipt` (iframe oculto) pero con CSS para página completa.
 *
 * Esperamos un elemento que tenga la clase `.receipt-letter` (el render del
 * componente ReceiptLetter). Inyectamos un stylesheet mínimo con las clases
 * Tailwind que el layout usa.
 */
export function printReceiptLetter(receiptEl: Element | null) {
  if (!receiptEl || typeof window === 'undefined') return;

  const html = receiptEl.outerHTML;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Factura</title>
<style>
  @page { size: letter; margin: 14mm 12mm; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  *, *::before, *::after { box-sizing: border-box; }

  .receipt-letter {
    width: 100%;
    background: #fff !important;
    color: #000 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  /* Layout */
  .flex { display: flex; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gap-y-1 { row-gap: 4px; }
  .gap-4 { gap: 16px; }
  .gap-6 { gap: 24px; }
  .items-start { align-items: flex-start; }
  .justify-between { justify-content: space-between; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .align-top { vertical-align: top; }

  /* Spacing */
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .mt-4 { margin-top: 16px; }
  .mt-6 { margin-top: 24px; }
  .my-3 { margin-top: 12px; margin-bottom: 12px; }
  .ml-1 { margin-left: 4px; }
  .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .pt-2 { padding-top: 8px; }
  .pt-4 { padding-top: 16px; }
  .pb-4 { padding-bottom: 16px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .space-y-1 > * + * { margin-top: 4px; }

  /* Typography */
  .text-\\[10px\\] { font-size: 10px; }
  .text-xs { font-size: 11px; }
  .text-sm { font-size: 12px; }
  .text-2xl { font-size: 22px; }
  .text-3xl { font-size: 28px; }
  .text-lg { font-size: 14px; }
  .font-mono { font-family: 'Courier New', Consolas, monospace; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .uppercase { text-transform: uppercase; }
  .italic { font-style: italic; }
  .tracking-tight { letter-spacing: -0.01em; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tabular-nums { font-variant-numeric: tabular-nums; }

  /* Color (modo print: gray a tonos) */
  .text-gray-500 { color: #6b7280; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-700 { color: #374151; }
  .text-rose-600 { color: #be123c; }
  .text-amber-700 { color: #b45309; }
  .text-red-700 { color: #b91c1c; }

  /* Borders */
  .border-b { border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #d1d5db; }
  .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
  .border-t { border-top-width: 1px; border-top-style: solid; border-top-color: #d1d5db; }
  .border-t-2 { border-top-width: 2px; border-top-style: solid; }
  .border-2 { border-width: 2px; border-style: solid; }
  .border-black { border-color: #000 !important; }
  .border-gray-300 { border-color: #d1d5db !important; }
  .border-red-600 { border-color: #dc2626 !important; }

  /* Logo */
  .receipt-letter img {
    display: block;
    object-fit: contain;
  }
  .h-20 { height: 80px; }
  .w-20 { width: 80px; }

  /* Tabla */
  table { width: 100%; border-collapse: collapse; }
  thead tr { border-bottom: 2px solid #000; }
  tbody tr { border-bottom: 1px solid #d1d5db; }

  /* Forzar negro para impresión, evitar tonos azules */
  .receipt-letter h1,
  .receipt-letter .font-bold { color: #000 !important; }
</style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // ignore
    }
    setTimeout(cleanup, 1000);
  };

  if (doc.readyState === 'complete') {
    setTimeout(triggerPrint, 50);
  } else {
    win.addEventListener('load', () => setTimeout(triggerPrint, 50), { once: true });
  }
}
