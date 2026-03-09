/**
 * PDF export module — generates a real PDF file and triggers a direct browser
 * download using html2pdf.js (html2canvas + jsPDF). No print dialog is shown.
 *
 * Strategy: operate on the live preview element in-place.
 * 1. Temporarily switch the app to light theme so the preview renders with
 *    white backgrounds and dark text.
 * 2. Pass the real DOM element to html2pdf — all CSS is already computed and
 *    applied by the browser, so html2canvas captures it faithfully.
 * 3. Restore the original theme afterwards.
 *
 * This is far more reliable than cloning to an off-screen container, because
 * <style> tags injected inside a <div> are ignored by browsers, and off-screen
 * elements may not have their stylesheets resolved by html2canvas.
 */

import html2pdf from 'html2pdf.js';

/**
 * Sanitise a filename by stripping characters unsafe for file-systems.
 */
function sanitizeFilename(name: string): string {
  const normalized = name.normalize('NFKD').replace(/\.pdf$/i, '');
  return (
    normalized
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s\-_.]/g, ' ')
      .replace(/\.{2,}/g, '.')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/^\.+|\.+$/g, '')
      .trim() || 'document'
  );
}

/**
 * Export the given preview element as a PDF file that downloads directly to
 * the user's device — no print dialog, no system UI.
 *
 * @param element  - The live preview container (e.g. #preview-content) to export.
 * @param filename - Desired base filename (without the `.pdf` extension).
 */
export async function exportToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const safeName = sanitizeFilename(filename);

  // ── 1. Force light theme, suppressing CSS transitions ───────────────────
  //    We switch data-theme on <html> to "light" so all our CSS custom
  //    properties resolve to their light-mode values. We also inject a
  //    temporary <style> that zeroes all transitions/animations so the
  //    browser doesn't capture a mid-fade state.
  const root = document.documentElement;
  const originalTheme = root.getAttribute('data-theme') ?? 'dark';

  // Inject a temporary <style> that zeroes every transition/animation.
  const noTransitionStyle = document.createElement('style');
  noTransitionStyle.id = '__pdf-no-transition__';
  noTransitionStyle.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(noTransitionStyle);

  // Switch to light theme immediately (no animation because we killed it above).
  root.setAttribute('data-theme', 'light');

  // Also force explicit inline styles on the element itself as a failsafe —
  // html2canvas may not pick up all CSS-variable-resolved values if the OS
  // color scheme doesn't match. These will be removed in the finally block.
  const prevBg = element.style.backgroundColor;
  const prevColor = element.style.color;
  const prevHeight = element.style.height;
  const prevMaxHeight = element.style.maxHeight;
  const prevOverflow = element.style.overflow;
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#1f2328';

  // CRITICAL — collapse the element to its content height before capture.
  //
  // `#preview-content` has `flex: 1` in the layout, which stretches it to fill
  // the full pane (e.g. 900 px). html2canvas captures the element at that
  // stretched height even when the markdown content is only 200 px tall.
  // jsPDF then paginates all the empty vertical space and produces several
  // blank pages at the end.
  //
  // Setting height/maxHeight to `fit-content` and overflow to `visible` lets
  // the element shrink to exactly its content height for the duration of the
  // capture. We restore all values in the finally block.
  element.style.height = 'fit-content';
  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';

  // Wait for three frames: layout → paint → composite.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve()),
      ),
    ),
  );

  // ── 2. html2pdf options ───────────────────────────────────────────────────
  //    windowWidth matches the element's natural rendered width so html2canvas
  //    doesn't try to fit a desktop page into a narrow viewport.
  //    windowHeight is set to scrollHeight (content height) so the canvas is
  //    exactly as tall as the content — no extra whitespace at the bottom.
  const elementWidth = element.scrollWidth || element.offsetWidth || 860;
  const elementHeight = element.scrollHeight || element.offsetHeight;

  const opts = {
    margin: [12, 12, 12, 12] as [number, number, number, number], // mm
    filename: `${safeName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,               // 2× for retina-quality text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: elementWidth,
      windowHeight: elementHeight,
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  // ── 3. Generate and auto-download ─────────────────────────────────────────
  try {
    await html2pdf().set(opts).from(element).save();
  } finally {
    // Restore original theme and re-enable transitions unconditionally.
    root.setAttribute('data-theme', originalTheme);
    noTransitionStyle.remove();
    element.style.backgroundColor = prevBg;
    element.style.color = prevColor;
    element.style.height = prevHeight;
    element.style.maxHeight = prevMaxHeight;
    element.style.overflow = prevOverflow;
  }
}
