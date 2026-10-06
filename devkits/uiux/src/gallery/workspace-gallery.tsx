import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspaceHeader } from "@cxsun/ui/workspace/header";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTableHeaderCell, WorkspaceTablePanel } from "@cxsun/ui/workspace/table";
import {
  WorkspaceFormActions,
  WorkspaceFormBody,
  WorkspaceFormGrid,
  WorkspaceFormSurface
} from "@cxsun/ui/workspace/upsert";
import { GalleryCard, SectionHeading } from "./gallery-card";

const sampleRows = [
  { name: "Shared workspace", kind: "Layout", status: "Ready" },
  { name: "Table pattern", kind: "Block", status: "Review" },
  { name: "Form surface", kind: "Block", status: "Ready" }
];

export function WorkspaceGallery() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rows = sampleRows.filter((row) =>
    `${row.name} ${row.kind} ${row.status}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid gap-5">
      <SectionHeading
        title="Workspace blocks"
        description="Live shared pieces used to assemble list, detail, and form screens."
      />
      <GalleryCard
        title="List pattern"
        description="Header, filters, table, status, and pagination from the UI package."
      >
        <div className="grid gap-3">
          <WorkspaceHeader
            actions={
              <Button size="sm" type="button">
                New item
              </Button>
            }
            subtitle="Example content for layout review"
            title="Workspace items"
          />
          <WorkspaceFilters
            onSearchValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search examples"
            searchValue={search}
          />
          <WorkspaceTablePanel>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <WorkspaceTableHeaderCell>Name</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Kind</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t" key={row.name}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.kind}</td>
                    <td className="px-4 py-3">
                      <WorkspaceStatusBadge
                        label={row.status}
                        tone={row.status === "Ready" ? "success" : "warning"}
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={3}>
                      No examples match.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </WorkspaceTablePanel>
          <WorkspacePagination
            onPageChange={setPage}
            page={page}
            rowsPerPage={10}
            showingLabel={`Showing ${rows.length} of ${rows.length}`}
            singularLabel="items"
            totalCount={rows.length}
            totalPages={1}
          />
        </div>
      </GalleryCard>
      <GalleryCard
        title="Form pattern"
        description="The shared surface, body, grid, and action row."
      >
        <WorkspaceFormSurface>
          <WorkspaceFormBody>
            <WorkspaceFormGrid>
              <label className="grid gap-1.5 text-sm font-medium">
                Name <Input placeholder="Example name" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Reference <Input placeholder="Example reference" />
              </label>
            </WorkspaceFormGrid>
          </WorkspaceFormBody>
          <WorkspaceFormActions>
            <Button type="button">Save</Button>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </WorkspaceFormActions>
        </WorkspaceFormSurface>
      </GalleryCard>
    </div>
  );
}
