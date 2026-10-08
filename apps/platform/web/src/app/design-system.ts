import {
  DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  DESIGN_SYSTEM_NAME,
  DESIGN_SYSTEM_VARIANT_MARKER,
  defaultDesignSystemVariantId,
  isDesignSystemVariantId
} from "@cxsun/ui/design-system";
import type { DesignSystemVariantId } from "@cxsun/ui/design-system";

const APPEARANCE_MODE_STORAGE_KEY = "cxsun.appearance.mode";
let systemDarkQuery: MediaQueryList | null = null;

export type AppearanceMode = "system" | "light" | "dark";

export function getAppearanceMode(): AppearanceMode {
  const storedMode = window.localStorage.getItem(APPEARANCE_MODE_STORAGE_KEY);
  return storedMode === "light" || storedMode === "dark" ? storedMode : "system";
}

export function setAppearanceMode(mode: AppearanceMode) {
  window.localStorage.setItem(APPEARANCE_MODE_STORAGE_KEY, mode);
  applyAppearanceMode();
}

export function getDesignVariantId(): DesignSystemVariantId {
  const storedVariant = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);
  return storedVariant && isDesignSystemVariantId(storedVariant)
    ? storedVariant
    : defaultDesignSystemVariantId;
}

export function setDesignVariantId(variant: DesignSystemVariantId) {
  window.localStorage.setItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY, variant);
  document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, variant);
}

export function applyDesignSystemPreference() {
  document.documentElement.setAttribute("data-design-system", DESIGN_SYSTEM_NAME);
  document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, getDesignVariantId());
  if (!systemDarkQuery && typeof window.matchMedia === "function") {
    systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemDarkQuery.addEventListener("change", applyAppearanceMode);
  }
  applyAppearanceMode();
}

function applyAppearanceMode() {
  const mode = getAppearanceMode();
  document.documentElement.classList.toggle(
    "dark",
    mode === "dark" || (mode === "system" && systemDarkQuery?.matches === true)
  );
}
