import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { crmRequest } from "../../crm-request";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactprofilesKey, useContactProfiles } from "./contact-profiles.hooks";
import { saveContactProfiles, setContactProfilesActive } from "./contact-profiles.services";
import type { ContactProfilesInput, ContactProfilesRecord } from "./contact-profiles.types";

const empty = (parentId: number): ContactProfilesInput => ({
  coreContactId: parentId,
  displayName: null,
  customerKind: null,
  industryId: 0,
  businessType: null,
  customerSince: null
});

export function ContactProfilesSection({ parentId, onSaved }: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactProfiles(parentId);
  const industries = useQuery({
    queryKey: ["crm", "contact-360", "industries"],
    queryFn: () => crmRequest<Array<{ id: number; name: string }>>("/tenant/industries")
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactProfilesInput>(() => empty(parentId));
  const records = query.data ?? [];
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const set = <Key extends keyof ContactProfilesInput>(
    key: Key,
    value: ContactProfilesInput[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setSelectedId(null);
    setForm(empty(parentId));
  }, [parentId]);
  useEffect(() => {
    const first = records[0];
    if (first && selectedId === null) {
      setSelectedId(first.id);
      setForm(first);
    }
  }, [records, selectedId]);
  const mutation = useMutation({
    mutationFn: (input: ContactProfilesInput) => saveContactProfiles(input, selectedId),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: contactprofilesKey });
      setSelectedId(record.id);
      setForm(record);
      onSaved?.();
      toast.success("Customer profile saved");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  const toggle = useMutation({
    mutationFn: (record: ContactProfilesRecord) =>
      setContactProfilesActive(record.id, record.status !== "active"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactprofilesKey });
      onSaved?.();
    },
    onError: (error) => toast.error("Unable to change status", { description: error.message })
  });
  function select(record: ContactProfilesRecord | null) {
    setSelectedId(record?.id ?? null);
    setForm(record ?? empty(parentId));
  }
  if (query.isError)
    return (
      <div className="rounded-lg border p-6 text-sm text-destructive">
        Unable to load records.{" "}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(14rem,0.34fr)_minmax(0,1fr)]">
      <div className="rounded-lg border bg-card p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Customer profile</h3>
        </div>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        ) : null}
        <div className="space-y-1">
          {records.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${item.id === selectedId ? "bg-accent" : "hover:bg-muted"}`}
            >
              <span className="block truncate font-medium">
                {String(item.displayName ?? "Record #" + item.id)}
              </span>
              <span className="text-xs text-muted-foreground">{item.status}</span>
            </button>
          ))}
        </div>
      </div>
      <form
        id="contact360-active-form"
        className="space-y-5 rounded-lg border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{selected ? "Edit" : "New"} customer profile</h3>
          {selected ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate(selected)}
            >
              {selected.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm font-medium">
            Display Name
            <Input
              type="text"
              value={form.displayName ?? ""}
              required={false}
              onChange={(event) => set("displayName", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Customer Kind
            <Input
              type="text"
              value={form.customerKind ?? ""}
              required={false}
              onChange={(event) => set("customerKind", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Industry
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.industryId ?? ""}
              onChange={(event) =>
                set("industryId", event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">Select industry</option>
              {industries.data?.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Business Type
            <Input
              type="text"
              value={form.businessType ?? ""}
              required={false}
              onChange={(event) => set("businessType", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Customer Since
            <Input
              type="date"
              value={form.customerSince ?? ""}
              required={false}
              onChange={(event) => set("customerSince", event.target.value || null)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
