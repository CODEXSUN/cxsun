import { useState } from "react";
import { Badge } from "@cxsun/ui/components/badge";
import { Button } from "@cxsun/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@cxsun/ui/components/card";
import { Checkbox } from "@cxsun/ui/components/checkbox";
import { Input } from "@cxsun/ui/components/input";
import { Label } from "@cxsun/ui/components/label";
import { Switch } from "@cxsun/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cxsun/ui/components/tabs";
import { Textarea } from "@cxsun/ui/components/textarea";
import { GalleryCard, SectionHeading } from "./gallery-card";

export function ComponentsGallery({ componentCatalogHref }: { componentCatalogHref?: string }) {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading
          title="Components"
          description="Live controls imported through public @cxsun/ui component paths."
        />
        {componentCatalogHref ? (
          <a
            className="text-sm font-medium text-primary hover:underline"
            href={componentCatalogHref}
          >
            Open full component catalog
          </a>
        ) : null}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <GalleryCard
          title="Actions"
          description="Primary, secondary, and destructive button treatments."
        >
          <div className="flex flex-wrap gap-2">
            <Button type="button">Save changes</Button>
            <Button type="button" variant="outline">
              Preview
            </Button>
            <Button type="button" variant="ghost">
              More options
            </Button>
            <Button type="button" variant="destructive">
              Delete
            </Button>
          </div>
          <code className="mt-4 block text-xs text-muted-foreground">
            @cxsun/ui/components/button
          </code>
        </GalleryCard>
        <GalleryCard title="Form inputs" description="Labels, text fields, and a larger text area.">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="uiux-name">Name</Label>
              <Input id="uiux-name" placeholder="Workspace name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="uiux-description">Description</Label>
              <Textarea id="uiux-description" placeholder="Describe the workspace" />
            </div>
          </div>
        </GalleryCard>
        <GalleryCard
          title="State and selection"
          description="Status, checkbox, and switch controls."
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Active</Badge>
              <Badge variant="secondary">Draft</Badge>
              <Badge variant="outline">Review</Badge>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Receive updates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={enabled} onCheckedChange={setEnabled} /> Enable workspace
            </label>
          </div>
        </GalleryCard>
        <GalleryCard title="Content structure" description="Tabs and cards for related content.">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Shared components keep the interaction and visual treatment consistent.
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="details" className="text-sm text-muted-foreground">
              Each variant can be reviewed before use in a desk.
            </TabsContent>
          </Tabs>
        </GalleryCard>
      </div>
    </div>
  );
}
