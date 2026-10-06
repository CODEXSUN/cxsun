import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceLookup } from "@cxsun/ui/workspace/lookup";
import { WorkspaceTableEmptyState } from "@cxsun/ui/workspace/table";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceUpsertDialog
} from "@cxsun/ui/workspace/upsert";
import { enquiryActivityQueryKey, enquiryEstimatesQueryKey } from "./enquiry.hooks";
import { createEnquiryEstimate, updateEnquiryEstimate } from "./enquiry.services";
import type { EnquiryEstimate, EnquiryEstimateSavePayload, EnquiryLookup } from "./enquiry.types";

export function EnquiryEstimates({
  enquiryId,
  estimates,
  contacts,
  loading
}: {
  enquiryId: number;
  estimates: EnquiryEstimate[];
  contacts: EnquiryLookup[];
  loading: boolean;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EnquiryEstimate | null | undefined>(undefined);
  const save = useMutation({
    mutationFn: (input: EnquiryEstimateSavePayload) =>
      editing
        ? updateEnquiryEstimate(enquiryId, editing.id, input)
        : createEnquiryEstimate(enquiryId, input),
    onSuccess: async () => {
      setEditing(undefined);
      await Promise.all([
        client.invalidateQueries({ queryKey: enquiryEstimatesQueryKey(enquiryId) }),
        client.invalidateQueries({ queryKey: enquiryActivityQueryKey(enquiryId) })
      ]);
      toast.success("Estimate saved");
    },
    onError: (error) => toast.error("Unable to save estimate", { description: error.message })
  });

  return (
    <section className="min-h-[34rem] bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Vendor estimates linked to this enquiry.</p>
        <Button type="button" onClick={() => setEditing(null)}>
          <FilePlus2 className="size-4" /> New estimate
        </Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading estimates…</p> : null}
      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              {["Estimate", "Date", "Item", "Vendor", "Price", "Action"].map((label) => (
                <th className="px-3 py-2" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => (
              <tr className="border-t border-border/70" key={estimate.id}>
                <td className="px-3 py-2 font-medium">#{estimate.id}</td>
                <td className="px-3 py-2">{estimate.date}</td>
                <td className="px-3 py-2">{estimate.itemName}</td>
                <td className="px-3 py-2">{estimate.supplierName}</td>
                <td className="px-3 py-2">₹{estimate.price.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(estimate)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && estimates.length === 0 ? (
          <WorkspaceTableEmptyState>No estimates have been recorded.</WorkspaceTableEmptyState>
        ) : null}
      </div>
      {editing !== undefined ? (
        <EstimateDialog
          key={editing?.id ?? "new"}
          record={editing}
          contacts={contacts}
          loading={save.isPending}
          error={save.error?.message ?? ""}
          onClose={() => setEditing(undefined)}
          onSave={(input) => save.mutate(input)}
        />
      ) : null}
    </section>
  );
}

function EstimateDialog({
  record,
  contacts,
  loading,
  error,
  onClose,
  onSave
}: {
  record: EnquiryEstimate | null;
  contacts: EnquiryLookup[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSave: (input: EnquiryEstimateSavePayload) => void;
}) {
  const [date, setDate] = useState(record?.date ?? new Date().toISOString().slice(0, 10));
  const [itemName, setItemName] = useState(record?.itemName ?? "");
  const [supplier, setSupplier] = useState(record ? String(record.supplierContactId) : "");
  const [price, setPrice] = useState(record ? String(record.price) : "");
  const [issue, setIssue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(price);
    if (!date || !itemName.trim() || !supplier || !Number.isFinite(amount) || amount <= 0) {
      setIssue("Enter a date, item, vendor, and price greater than zero.");
      return;
    }
    onSave({ date, itemName: itemName.trim(), supplierContactId: Number(supplier), price: amount });
  }

  return (
    <WorkspaceUpsertDialog
      title={record ? `Edit estimate #${record.id}` : "New estimate"}
      description="Select a Core contact as the vendor."
      open
      onClose={onClose}
    >
      <form className="space-y-4" noValidate onSubmit={submit}>
        {issue || error ? (
          <WorkspaceFormBanner title="Unable to save estimate">
            {issue || error}
          </WorkspaceFormBanner>
        ) : null}
        <WorkspaceFormField label="Date" required>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </WorkspaceFormField>
        <WorkspaceFormField label="Item name" required>
          <Input
            maxLength={255}
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Vendor" required>
          <WorkspaceLookup
            allowTextValue={false}
            required
            showAllOptionsOnFocus
            options={contacts
              .filter((contact) => contact.status === "active")
              .map((contact) => ({ value: String(contact.id), label: contact.name }))}
            placeholder="Search vendor"
            value={supplier}
            onValueChange={setSupplier}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Price" required>
          <Input
            min="0.01"
            step="0.01"
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormFooter
          onCancel={onClose}
          primaryLabel="Save estimate"
          primaryLoading={loading}
        />
      </form>
    </WorkspaceUpsertDialog>
  );
}
