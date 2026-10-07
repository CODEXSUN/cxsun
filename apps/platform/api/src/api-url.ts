export function resolvePlatformApiUrl(url: string): string {
  if (url === "/api/app") return "/";
  return url.startsWith("/api/app/") ? url.slice("/api/app".length) : url;
}
