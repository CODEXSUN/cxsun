import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { SliderItem, SliderOptions } from "src/components/blocks/slider/slider.types"

export type SiteSliderStatus = "draft" | "published" | "archived"

export interface SiteSlider {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  placement: string
  status: SiteSliderStatus
  is_primary: boolean
  sort_order: number
  options: SliderOptions
  slides: SliderItem[]
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SiteSliderInput = Partial<SiteSlider>

export function emptySiteSlider(): SiteSliderInput {
  return {
    name: "",
    slug: "",
    placement: "home-slider",
    status: "draft",
    is_primary: false,
    sort_order: 1,
    options: {
      parallax: true,
      defaultDirection: "fade",
      defaultBackgroundMode: "cinematic",
      defaultIntensity: "medium",
      defaultVariant: "saas",
    },
    slides: [
      {
        id: 1,
        title: "New site slide",
        tagline: "Write a strong public message for this tenant.",
        action: { text: "Learn more", href: "/" },
        media: { type: "image", src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80" },
        highlights: [{ text: "Site", variant: "glass" }],
        titleStyle: { color: "#ffffff", fontSize: "", fontFamily: "", fontWeight: "700" },
        taglineStyle: { color: "#e5e7eb", fontSize: "", fontFamily: "", fontWeight: "400" },
        badgeStyle: { color: "#ffffff", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.24)", fontSize: "", fontFamily: "", fontWeight: "600" },
        buttonStyle: { color: "#111827", backgroundColor: "#ffffff", borderColor: "#ffffff", borderRadius: "0.5rem", fontSize: "", fontFamily: "", fontWeight: "700", iconSize: "1.25rem", size: "md" },
        ctaColor: "light",
        duration: 6000,
        direction: "fade",
        backgroundMode: "cinematic",
        overlayColor: "bg-gradient-to-r from-black/85 via-black/55 to-black/10",
      },
    ],
  }
}

export async function listSiteSliders(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/site/sliders`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Site slider list failed with status ${response.status}.`)
  return (await response.json()) as SiteSlider[]
}

export async function upsertSiteSlider(session: AuthSession, input: SiteSliderInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/site/sliders/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Site slider save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; slider?: SiteSlider; error?: string }
  if (!result.ok || !result.slider) throw new Error(result.error ?? "Site slider save failed.")
  return result.slider
}

export async function deleteSiteSlider(session: AuthSession, slider: SiteSlider) {
  const response = await fetch(`${apiBaseUrl}/api/v1/site/sliders/${encodeURIComponent(slider.uuid)}/delete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Site slider delete failed with status ${response.status}.`)
}
