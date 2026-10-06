import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import {
  DESIGN_SYSTEM_NAME,
  designSystemVariants,
  type DesignSystemVariantId
} from "@cxsun/ui/design-system";
import { GalleryCard, SectionHeading } from "./gallery-card";

export function FoundationsGallery() {
  const [variantId, setVariantId] = useState<DesignSystemVariantId>("default");
  const variant = designSystemVariants.find((entry) => entry.id === variantId)!;

  return (
    <div className="grid gap-5">
      <SectionHeading
        title="Foundations"
        description="Select a theme to inspect its tokens in this preview. The desk theme stays unchanged."
      />
      <GalleryCard title="Theme variants" description="Variants come from @cxsun/ui/design-system.">
        <div className="flex flex-wrap gap-2">
          {designSystemVariants.map((entry) => (
            <Button
              key={entry.id}
              aria-pressed={variantId === entry.id}
              onClick={() => setVariantId(entry.id)}
              size="sm"
              type="button"
              variant={variantId === entry.id ? "default" : "outline"}
            >
              {entry.name}
            </Button>
          ))}
        </div>
        <div
          className="mt-5 rounded-lg border bg-background p-5 text-foreground"
          data-design-system={DESIGN_SYSTEM_NAME}
          data-design-variant={variantId}
        >
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="text-xl font-semibold">{variant.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{variant.description}</p>
              <div className="mt-4 flex max-w-sm gap-2">
                <Input aria-label="Sample search" placeholder="Search the workspace" />
                <Button type="button">Search</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Palette colors">
              {variant.palette.map((color) => (
                <span
                  key={color}
                  className="size-10 rounded-md border border-black/10"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Radius: {variant.radius} · Density: {variant.density}
        </p>
      </GalleryCard>
      <div className="grid gap-5 md:grid-cols-2">
        <GalleryCard title="Typography" description="Shared Geist type and semantic text colors.">
          <p className="text-2xl font-semibold tracking-tight">Workspace heading</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Supporting text explains the next action.
          </p>
          <code className="mt-4 block text-xs text-primary">@cxsun/ui/styles.css</code>
        </GalleryCard>
        <GalleryCard title="Surface" description="Background, card, border, and focus treatments.">
          <div className="rounded-md border bg-background p-4">
            <div className="rounded-md border bg-card p-4 shadow-sm">
              <p className="font-medium">Shared card surface</p>
              <p className="mt-1 text-sm text-muted-foreground">One layer for related content.</p>
            </div>
          </div>
        </GalleryCard>
      </div>
    </div>
  );
}
