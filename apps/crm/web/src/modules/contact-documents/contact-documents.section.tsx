import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactdocumentsKey, useContactDocuments } from "./contact-documents.hooks";
import { saveContactDocuments, setContactDocumentsActive } from "./contact-documents.services";
import type { ContactDocumentsInput, ContactDocumentsRecord } from "./contact-documents.types";

const empty = (parentId: number): ContactDocumentsInput => ({
  personId: parentId,
  documentType: null,
  documentName: "",
  description: null,
  documentDate: null,
  expiryDate: null,
  fileRef: null
});

export function ContactDocumentsSection({ parentId, onSaved }: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactDocuments(parentId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactDocumentsInput>(() => empty(parentId));
  const records = query.data ?? [];
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const set = <Key extends keyof ContactDocumentsInput>(
    key: Key,
    value: ContactDocumentsInput[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setSelectedId(null);
    setForm(empty(parentId));
  }, [parentId]);
  const mutation = useMutation({
    mutationFn: (input: ContactDocumentsInput) => saveContactDocuments(input, selectedId),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: contactdocumentsKey });
      setSelectedId(record.id);
      setForm(record);
      onSaved?.();
      toast.success("Documents saved");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  const toggle = useMutation({
    mutationFn: (record: ContactDocumentsRecord) =>
      setContactDocumentsActive(record.id, record.status !== "active"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactdocumentsKey });
      onSaved?.();
    },
    onError: (error) => toast.error("Unable to change status", { description: error.message })
  });
  function select(record: ContactDocumentsRecord | null) {
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
          <h3 className="font-semibold">Documents</h3>
          <Button size="sm" variant="outline" onClick={() => select(null)}>
            New
          </Button>
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
                {String(item.documentName ?? "Record #" + item.id)}
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
          <h3 className="font-semibold">{selected ? "Edit" : "New"} document</h3>
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
            Document Type
            <Input
              type="text"
              value={form.documentType ?? ""}
              required={false}
              onChange={(event) => set("documentType", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Document Name *
            <Input
              type="text"
              value={form.documentName ?? ""}
              required={true}
              onChange={(event) => set("documentName", event.target.value || "")}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Description
            <Textarea
              value={form.description ?? ""}
              required={false}
              onChange={(event) => set("description", event.target.value)}
              rows={4}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Document Date
            <Input
              type="date"
              value={form.documentDate ?? ""}
              required={false}
              onChange={(event) => set("documentDate", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Expiry Date
            <Input
              type="date"
              value={form.expiryDate ?? ""}
              required={false}
              onChange={(event) => set("expiryDate", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            File Ref
            <Input
              type="text"
              value={form.fileRef ?? ""}
              required={false}
              onChange={(event) => set("fileRef", event.target.value || null)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
