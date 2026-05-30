import type { SliderPayload } from "src/components/blocks/slider/slider.types"

export const homeSliderData: SliderPayload = {
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
      title: "Codexsun tenant websites",
      tagline: "One frontend can resolve each tenant domain and open the right public page.",
      action: {
        text: "Open dashboard",
        href: "/app",
      },
      media: {
        type: "image",
        src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80",
      },
      highlights: [
        { text: "Domain aware", variant: "glass" },
        { text: "Tenant scoped", variant: "primary" },
      ],
      ctaColor: "light",
      duration: 6500,
      backgroundMode: "cinematic",
      overlayColor: "bg-gradient-to-r from-black/85 via-black/55 to-black/10",
    },
    {
      id: 2,
      title: "Static pages becoming dynamic",
      tagline: "Sections are marked for developers now, ready to connect content records next.",
      action: {
        text: "Contact us",
        href: "/contact",
      },
      media: {
        type: "image",
        src: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1800&q=80",
      },
      highlights: [
        { text: "Header", variant: "glass" },
        { text: "Slider", variant: "success" },
        { text: "Footer", variant: "glass" },
      ],
      ctaColor: "primary",
      duration: 6000,
      direction: "left",
      backgroundMode: "parallax",
      overlayColor: "bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent",
    },
    {
      id: 3,
      title: "Built for client-specific rollout",
      tagline: "Aaran, billing tenants, ecommerce, labs, sports, and industry pages can share the same base.",
      action: {
        text: "Explore services",
        href: "/services",
      },
      media: {
        type: "image",
        src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=80",
      },
      highlights: [
        { text: "Scalable", variant: "warning" },
        { text: "Modular", variant: "glass" },
      ],
      ctaColor: "warning",
      duration: 7000,
      direction: "right",
      backgroundMode: "cinematic",
      overlayColor: "bg-gradient-to-r from-black/80 via-black/50 to-black/5",
    },
  ],
}
