declare const __CXSUN_PLATFORM_WEB_ORIGIN__: string;

const platformWebOrigin = new URL(__CXSUN_PLATFORM_WEB_ORIGIN__);

export function platformWebUrl(path: string): string {
  return new URL(path, platformWebOrigin).toString();
}
