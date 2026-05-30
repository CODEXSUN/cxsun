export type SlideDirection = "left" | "right" | "fade";
export type VariantType = "classic" | "luxury" | "industrial" | "saas" | "cinematic";
export type BackgroundMode = "normal" | "parallax" | "3d" | "cinematic";
export type Intensity = "low" | "medium" | "high";

export type HighlightVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "glass";
export type CTAColor = "primary" | "secondary" | "success" | "warning" | "danger" | "dark" | "light";

export type SlideMedia =
  | { type: "image"; src: string }
  | { type: "video"; mp4: string; poster?: string }
  | { type: "youtube"; videoId: string };

export type SlideAction = {
  text: string;
  href: string;
};

export type SlideHighlight = {
  text: string;
  variant?: HighlightVariant;
};

export type SliderItem = {
  id: number;
  title: string;
  tagline: string;
  action: SlideAction;
  media: SlideMedia;
  highlights?: SlideHighlight[];
  btn_cta?: string;
  duration?: number;
  direction?: SlideDirection;
  variant?: VariantType;
  intensity?: Intensity;
  ctaColor?: CTAColor;
  backgroundMode?: BackgroundMode;
  showOverlay?: boolean;
  overlayColor?: string;
};

export type SliderOptions = {
  parallax?: boolean;
  defaultVariant?: VariantType;
  defaultIntensity?: Intensity;
  defaultDirection?: SlideDirection;
  defaultBackgroundMode?: BackgroundMode;
};

export type SliderPayload = {
  slides: SliderItem[];
  options?: SliderOptions;
};

export type FullScreenSliderProps = SliderPayload;

export const DEFAULT_SLIDER_OPTIONS: Required<SliderOptions> = {
  parallax: true,
  defaultVariant: "saas",
  defaultIntensity: "medium",
  defaultDirection: "fade",
  defaultBackgroundMode: "cinematic",
};
