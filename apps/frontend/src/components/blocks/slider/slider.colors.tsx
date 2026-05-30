import type { CTAColor, HighlightVariant } from "src/components/blocks/slider/slider.types";

export function getHighlightClasses(variant?: HighlightVariant): string {
  switch (variant) {
    case "primary":
      return "bg-blue-600/90 text-white";
    case "secondary":
      return "bg-gray-600/90 text-white";
    case "success":
      return "bg-green-600/90 text-white";
    case "warning":
      return "bg-yellow-500/90 text-black";
    case "danger":
      return "bg-red-600/90 text-white";
    case "glass":
      return "bg-white/20 text-white backdrop-blur";
    default:
      return "bg-white/20 text-white";
  }
}

export function getCTAColorClasses(color?: CTAColor): string {
  switch (color) {
    case "primary":
      return "bg-blue-600 text-white hover:bg-blue-700";
    case "secondary":
      return "bg-gray-600 text-white hover:bg-gray-700";
    case "success":
      return "bg-green-600 text-white hover:bg-green-700";
    case "warning":
      return "bg-yellow-500 text-black hover:bg-yellow-600";
    case "danger":
      return "bg-red-600 text-white hover:bg-red-700";
    case "dark":
      return "bg-black text-white hover:bg-neutral-800";
    case "light":
      return "bg-white text-black hover:bg-gray-200";
    default:
      return "bg-white text-black hover:bg-gray-200";
  }
}
