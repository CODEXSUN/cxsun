export function capturePrintDocument(selector: string) {
  const source = document.querySelector<HTMLElement>(selector)
  if (!source) throw new Error("Print document is not available.")

  const printRoot = source.cloneNode(true) as HTMLElement
  absolutizeUrls(printRoot)

  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node instanceof HTMLLinkElement
      ? `<link rel="stylesheet" href="${escapeAttribute(node.href)}">`
      : node.outerHTML)
    .join("\n")

  return `<!doctype html>
<html lang="${escapeAttribute(document.documentElement.lang || "en")}">
<head>
  <meta charset="utf-8">
  <base href="${escapeAttribute(window.location.href)}">
  ${styles}
</head>
<body>${printRoot.outerHTML}</body>
</html>`
}

function absolutizeUrls(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[src], [href]").forEach((element) => {
    for (const attribute of ["src", "href"]) {
      const value = element.getAttribute(attribute)
      if (!value || value.startsWith("data:") || value.startsWith("#")) continue
      try {
        element.setAttribute(attribute, new URL(value, window.location.href).href)
      } catch {
        // Keep malformed optional asset URLs from blocking the printable document.
      }
    }
  })
}

function escapeAttribute(value: string) {
  return value.replace(/[&"<]/g, (character) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;" })[character] ?? character)
}
