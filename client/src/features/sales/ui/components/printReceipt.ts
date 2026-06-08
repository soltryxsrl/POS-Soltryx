/**
 * Imprime un ticket usando un iframe invisible.
 *
 * Por qué iframe en vez de popup:
 * - No lo bloquean los pop-up blockers.
 * - El `@page { size: 80mm auto }` se respeta porque el iframe tiene un
 *   documento independiente sin el chrome del dashboard.
 * - El timing es predecible: esperamos `onload` antes de llamar `print()`.
 * - Sale del tamaño exacto del ticket en PDF / impresoras térmicas.
 */
export function printReceipt(receiptEl: Element | null) {
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
<title>Recibo</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 11px;
    line-height: 1.25;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  *, *::before, *::after { box-sizing: border-box; }

  .receipt {
    width: 80mm;
    padding: 4mm;
    margin: 0 auto;
    background: #fff !important;
    color: #000 !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  .receipt * { color: #000 !important; background: transparent !important; }
  /* Logo: máx 16mm de alto para no comerse la cabecera del ticket. */
  .receipt img.logo {
    display: block;
    margin: 0 auto 2mm auto;
    max-height: 16mm;
    max-width: 60mm;
    object-fit: contain;
  }

  /* Tailwind utilities que usa Receipt.tsx (mapeadas a CSS plano). */
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .italic { font-style: italic; }
  .uppercase { text-transform: uppercase; }
  .tracking-wide { letter-spacing: 0.025em; }
  .leading-tight { line-height: 1.25; }
  .text-base { font-size: 13px; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[11px\\] { font-size: 11px; }

  .grid { display: grid; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .break-words { word-wrap: break-word; overflow-wrap: anywhere; }
  .whitespace-nowrap { white-space: nowrap; }
  .overflow-hidden { overflow: hidden; }
  .select-none { user-select: none; }
  .opacity-75 { opacity: 0.75; }

  .my-0\\.5 { margin-top: 2px; margin-bottom: 2px; }
  .my-1 { margin-top: 4px; margin-bottom: 4px; }
  .mb-0\\.5 { margin-bottom: 2px; }
  .px-1 { padding-left: 4px; padding-right: 4px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .pl-\\[4ch\\] { padding-left: 4ch; }

  .h-10 { height: 40px; }
  .h-12 { height: 48px; }
  .h-16 { height: 64px; }

  .border { border-width: 1px; border-style: solid; }
  .border-black { border-color: #000 !important; }
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
    // Dejar 1s para que el diálogo de print procese antes de quitar el iframe.
    setTimeout(cleanup, 1000);
  };

  // Espera a que las imágenes (el logo del negocio, ahora una URL del CDN en
  // vez de un data-URI inline) terminen de cargar ANTES de imprimir; si no, el
  // print() dispara antes de que la imagen descargue y el logo sale en blanco.
  // Con un timeout de seguridad para no colgar la impresión si el CDN tarda/cae.
  const printWhenReady = () => {
    const pending = Array.from(doc.images ?? []).filter((img) => !img.complete);
    if (pending.length === 0) {
      setTimeout(triggerPrint, 50);
      return;
    }
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      setTimeout(triggerPrint, 50);
    };
    let remaining = pending.length;
    const onOne = () => {
      remaining -= 1;
      if (remaining <= 0) go();
    };
    for (const img of pending) {
      img.addEventListener('load', onOne, { once: true });
      img.addEventListener('error', onOne, { once: true });
    }
    setTimeout(go, 3000); // no bloquear la impresión por una imagen lenta/rota
  };

  // El onload del iframe garantiza que el documento parseó el <style> y el body
  // renderizó; luego printWhenReady espera la descarga del logo.
  if (doc.readyState === 'complete') {
    printWhenReady();
  } else {
    win.addEventListener('load', printWhenReady, { once: true });
  }
}
