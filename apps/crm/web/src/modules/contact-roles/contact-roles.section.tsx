import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactrolesKey, useContactRoles } from "./contact-roles.hooks";
import { saveContactRoles, setContactRolesActive } from "./contact-roles.services";
import type { ContactRolesInput, ContactRolesRecord } from "./contact-roles.types";

const empty = (parentId: number): ContactRolesInput => ({
  personId: parentId,
  roleName: "",
  isPrimaryRole: false,
  decisionAuthority: null,
  influenceLevel: null
});

export function ContactRolesSection({ parentId, onSaved }: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactRoles(parentId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactRolesInput>(() => empty(parentId));
  const records = query.data ?? [];
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const set = <Key extends keyof ContactRolesInput>(key: Key, value: ContactRolesInput[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setSelectedId(null);
    setForm(empty(parentId));
  }, [parentId]);
  const mutation = useMutation({
    mutationFn: (input: ContactRolesInput) => saveContactRoles(input, selectedId),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: contactrolesKey });
      setSelectedId(record.id);
      setForm(record);
      onSaved?.();
      toast.success("Roles saved");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  const toggle = useMutation({
    mutationFn: (record: ContactRolesRecord) =>
      setContactRolesActive(record.id, record.status !== "active"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactrolesKey });
      onSaved?.();
    },
    onError: (error) => toast.error("Unable to change status", { description: error.message })
  });
  function select(record: ContactRolesRecord | null) {
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
          <h3 className="font-semibold">Roles</h3>
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
                {String(item.roleName ?? "Record #" + item.id)}
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
          <h3 className="font-semibold">{selected ? "Edit" : "New"} role</h3>
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
            Role Name *
            <Input
              type="text"
              value={form.roleName ?? ""}
              required={true}
              onChange={(event) => set("roleName", event.target.value || "")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPrimaryRole}
              onChange={(event) => set("isPrimaryRole", event.target.checked)}
            />
            Is Primary Role
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Decision Authority
            <Input
              type="text"
              value={form.decisionAuthority ?? ""}
              required={false}
              onChange={(event) => set("decisionAuthority", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Influence Level
            <Input
              type="text"
              value={form.influenceLevel ?? ""}
              required={false}
              onChange={(event) => set("influenceLevel", event.target.value || null)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
