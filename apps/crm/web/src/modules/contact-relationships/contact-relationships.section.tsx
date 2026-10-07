import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactrelationshipsKey, useContactRelationships } from "./contact-relationships.hooks";
import {
  saveContactRelationships,
  setContactRelationshipsActive
} from "./contact-relationships.services";
import type {
  ContactRelationshipsInput,
  ContactRelationshipsRecord
} from "./contact-relationships.types";

const empty = (parentId: number): ContactRelationshipsInput => ({
  customerContactId: parentId,
  personAId: 0,
  personBId: 0,
  relationshipType: "",
  relationshipStrength: null,
  notes: null
});

export function ContactRelationshipsSection({
  parentId,
  people = [],
  onSaved
}: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactRelationships(parentId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactRelationshipsInput>(() => empty(parentId));
  const records = query.data ?? [];
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const set = <Key extends keyof ContactRelationshipsInput>(
    key: Key,
    value: ContactRelationshipsInput[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setSelectedId(null);
    setForm(empty(parentId));
  }, [parentId]);
  const mutation = useMutation({
    mutationFn: (input: ContactRelationshipsInput) => saveContactRelationships(input, selectedId),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: contactrelationshipsKey });
      setSelectedId(record.id);
      setForm(record);
      onSaved?.();
      toast.success("Relationships saved");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  const toggle = useMutation({
    mutationFn: (record: ContactRelationshipsRecord) =>
      setContactRelationshipsActive(record.id, record.status !== "active"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactrelationshipsKey });
      onSaved?.();
    },
    onError: (error) => toast.error("Unable to change status", { description: error.message })
  });
  function select(record: ContactRelationshipsRecord | null) {
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
          <h3 className="font-semibold">Relationships</h3>
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
                {String(item.relationshipType ?? "Record #" + item.id)}
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
          <h3 className="font-semibold">{selected ? "Edit" : "New"} relationship</h3>
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
            Person A Id *
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.personAId}
              required={true}
              onChange={(event) => set("personAId", Number(event.target.value))}
            >
              <option value={0}>Select person a id</option>
              {people
                .filter((item) => item.status === "active")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName || [item.firstName, item.lastName].filter(Boolean).join(" ")}
                  </option>
                ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Person B Id *
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.personBId}
              required={true}
              onChange={(event) => set("personBId", Number(event.target.value))}
            >
              <option value={0}>Select person b id</option>
              {people
                .filter((item) => item.status === "active")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName || [item.firstName, item.lastName].filter(Boolean).join(" ")}
                  </option>
                ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Relationship Type *
            <Input
              type="text"
              value={form.relationshipType ?? ""}
              required={true}
              onChange={(event) => set("relationshipType", event.target.value || "")}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Relationship Strength
            <Input
              type="text"
              value={form.relationshipStrength ?? ""}
              required={false}
              onChange={(event) => set("relationshipStrength", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Notes
            <Textarea
              value={form.notes ?? ""}
              required={false}
              onChange={(event) => set("notes", event.target.value)}
              rows={4}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
