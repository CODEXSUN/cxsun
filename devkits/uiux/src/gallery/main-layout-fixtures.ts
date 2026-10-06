import { PanelsTopLeftIcon } from "lucide-react";
import type { TopMenuAppItem, TopMenuUser } from "@cxsun/ui/layouts/main-layouts";

export const galleryUser: TopMenuUser = {
  email: "uiux@example.com",
  fallback: "U",
  name: "UIUX User"
};

export const galleryApps: TopMenuAppItem[] = [
  {
    active: true,
    description: "Shared UI gallery",
    icon: PanelsTopLeftIcon,
    title: "UIUX",
    url: "?uiux=main-layouts"
  }
];
