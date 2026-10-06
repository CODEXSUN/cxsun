import { Input } from "@cxsun/ui/components/input";
import { WorkspaceFormField } from "@cxsun/ui/workspace";

export function SupplierSummaryForm({
  onSearchChange,
  search
}: {
  onSearchChange: (value: string) => void;
  search: string;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-card p-4 shadow-sm">
      <WorkspaceFormField label="Supplier or code">
        <Input
          className="h-11 max-w-xl"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search outstanding suppliers"
          value={search}
        />
      </WorkspaceFormField>
    </div>
  );
}
