/**
 * Imprime un reporte X/Z en una hoja térmica 80mm.
 * Comparte la misma técnica del printReceipt: iframe oculto + CSS @page.
 */
export function printReportEl(reportEl: Element | null) {
  if (!reportEl || typeof window === 'undefined') return;
  const html = reportEl.outerHTML;

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
<title>Reporte de caja</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body {
    margin: 0; padding: 0; background: #fff; color: #000;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 11px; line-height: 1.25;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .report {
    width: 80mm; padding: 4mm; margin: 0 auto;
    background: #fff !important; color: #000 !important;
  }
  .report * { color: #000 !important; background: transparent !important; }
  .report img.logo {
    display: block;
    margin: 0 auto 2mm auto;
    max-height: 14mm;
    max-width: 60mm;
    object-fit: contain;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .uppercase { text-transform: uppercase; }
  .pl-2 { padding-left: 8px; }
  .opacity-75 { opacity: 0.75; }
  .text-base { font-size: 13px; }
  .text-\\[10px\\] { font-size: 10px; }
  .my-0\\.5 { margin-top: 2px; margin-bottom: 2px; }
  .flex { display: flex; }
  .grid { display: grid; }
  .justify-between { justify-content: space-between; }
  .select-none { user-select: none; }
  .overflow-hidden { overflow: hidden; }
  .whitespace-nowrap { white-space: nowrap; }
  .h-10 { height: 40px; }
  .h-6 { height: 24px; }
  .italic { font-style: italic; }
  .tracking-wider { letter-spacing: 0.05em; }
  .mt-2 { margin-top: 8px; }
  .break-words { word-wrap: break-word; overflow-wrap: anywhere; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .text-\\[11px\\] { font-size: 11px; }
</style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // ignore
    }
    setTimeout(cleanup, 1000);
  };

  if (doc.readyState === 'complete') setTimeout(trigger, 50);
  else win.addEventListener('load', () => setTimeout(trigger, 50), { once: true });
}
