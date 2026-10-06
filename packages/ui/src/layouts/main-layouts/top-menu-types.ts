import type { LucideIcon } from "lucide-react";

export type TopMenuAppItem = {
  active?: boolean;
  description: string;
  icon: LucideIcon;
  onSelect?: () => void;
  title: string;
  url?: string;
};

export type TopMenuUser = {
  avatarSrc?: string;
  email: string;
  fallback: string;
  name: string;
};
