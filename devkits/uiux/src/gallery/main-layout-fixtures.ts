import { PanelsTopLeftIcon } from "lucide-react";
import type {
  TopMenuAppItem,
  TopMenuNotification,
  TopMenuUser
} from "@cxsun/ui/layouts/main-layouts";

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
    url: "/uiux/main-layouts"
  }
];

export const galleryNotifications: TopMenuNotification[] = [
  {
    id: "layout-ready",
    title: "Main Layout is ready",
    body: "The shared app shell is available in the gallery."
  },
  {
    id: "new-components",
    title: "Components updated",
    body: "Review the latest reusable layout parts."
  }
];
