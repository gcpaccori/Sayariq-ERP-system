/**
 * Lightweight replacement for `react-to-print`.
 *
 * Returns a callback that opens a new window, copies the given element’s
 * styles + HTML and fires the browser print dialog.
 */
export function usePrint(options: {
  /** A function that returns the element you want to print (e.g. ref.current) */
  content: () => HTMLElement | null
  /** Title shown in the print-preview tab */
  documentTitle?: string
}) {
  return () => {
    const node = options.content()
    if (!node) return

    const printWindow = window.open("", "", "width=800,height=600")
    if (!printWindow) return

    /* copy page styles */
    const styleSheets = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join("\n")

    printWindow.document.write(`
      <html>
        <head>
          <title>${options.documentTitle ?? "print"}</title>
          ${styleSheets}
        </head>
        <body>${node.outerHTML}</body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // give the new doc a moment to render before printing
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }
}
