export function galleryPageFromUrl(): string | null {
  const pathMatch = window.location.pathname.match(/^\/uiux\/(.+?)\/?$/);
  return pathMatch?.[1] ?? new URLSearchParams(window.location.search).get("uiux");
}

export function galleryPageUrl(page: string, previewMode?: string): string {
  const url = new URL(window.location.href);
  if (url.pathname.startsWith("/sa/")) {
    url.searchParams.set("uiux", page);
  } else {
    url.pathname = `/uiux/${page}`;
    url.searchParams.delete("uiux");
  }
  if (previewMode) url.searchParams.set("uiuxPreview", previewMode);
  return `${url.pathname}${url.search}`;
}
