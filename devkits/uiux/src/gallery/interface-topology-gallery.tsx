import { mainLayoutTopologyDesks } from "./interface-topology-fixtures";
import { GalleryCard, SectionHeading } from "./gallery-card";
import { galleryPageUrl } from "./gallery-routes";

const importPath = "@cxsun/ui/features/interface-topology";

function topologyPreviewUrl() {
  return galleryPageUrl("main-layouts", "main-layout");
}

export function InterfaceTopologyGallery() {
  return (
    <div className="grid gap-5">
      <SectionHeading
        description="Inspect live layout regions, show their labels, and highlight their boundaries. The tag button in the preview opens the inspector."
        title="Interface topology"
      />
      <GalleryCard
        description="The working Main Layout with its top menu, side menu, app header, workspace canvas, and status bar registered in screen order."
        title="Live Main Layout topology"
      >
        <iframe
          className="h-[min(65vh,36rem)] min-h-96 w-full rounded-md border bg-background"
          src={topologyPreviewUrl()}
          title="Interface topology live preview"
        />
      </GalleryCard>
      <GalleryCard
        description="Registered regions in the live preview. Technical names can be copied from the inspector."
        title="Regions"
      >
        <h3 className="mb-2 text-sm font-semibold">{mainLayoutTopologyDesks[0]?.sectionHeading}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {mainLayoutTopologyDesks[0]?.sections.map((section) => (
            <div className="rounded-md border p-3" key={section.id}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {section.id}
                </span>
                {section.name}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              <code className="mt-2 block break-all text-xs text-violet-700">
                {section.technicalName}
              </code>
            </div>
          ))}
        </div>
      </GalleryCard>
      <p className="text-xs text-muted-foreground">
        Import the controller, regions, and inspector from <code>{importPath}</code>.
      </p>
    </div>
  );
}
