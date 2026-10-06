import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@cxsun/ui/components/dialog";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceFormField } from "@cxsun/ui/workspace/upsert";
import { contactSchema, prepareContactPayloadForSave } from "./contact.schema";
import { contactsQueryKey } from "./contact.hooks";
import { getContact, updateContact } from "./contact.services";
import type {
  ContactEmail,
  ContactPhone,
  ContactRecord,
  ContactSavePayload
} from "./contact.types";

export function ContactQuickEditDialog({
  contactId,
  onOpenChange,
  onSaved
}: {
  contactId: number | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (contact: ContactRecord) => void | Promise<void>;
}) {
  const query = useQuery({
    enabled: contactId !== null,
    queryFn: () => getContact(contactId!),
    queryKey: [...contactsQueryKey, "quick-edit", contactId]
  });
  const client = useQueryClient();

  return (
    <Dialog open={contactId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(event) => event.preventDefault()}>
        {query.data && query.data.id === contactId ? (
          <ContactQuickEditForm
            key={query.data.id}
            contact={query.data}
            onCancel={() => onOpenChange(false)}
            onSave={async (payload) => {
              const saved = await updateContact(query.data.id, payload);
              await client.invalidateQueries({ queryKey: contactsQueryKey });
              await onSaved(saved);
              onOpenChange(false);
              toast.success("Contact saved", { description: saved.name });
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit contact</DialogTitle>
              <DialogDescription>Update the selected Core contact.</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {query.error ? query.error.message : "Loading contact..."}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContactQuickEditForm({
  contact,
  onCancel,
  onSave
}: {
  contact: ContactRecord;
  onCancel: () => void;
  onSave: (payload: ContactSavePayload) => Promise<void>;
}) {
  const [name, setName] = useState(contact.name);
  const [legalName, setLegalName] = useState(contact.legalName ?? "");
  const [mobile, setMobile] = useState(primaryValue(contact.phones, contact.primaryPhone));
  const [email, setEmail] = useState(primaryValue(contact.emails, contact.primaryEmail));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const payload = prepareContactPayloadForSave({
      code: contact.code,
      name,
      legalName,
      typeId: contact.typeId ?? 0,
      groupId: contact.groupId,
      gstin: contact.gstin,
      pan: contact.pan,
      msmeNo: contact.msmeNo,
      msmeCategory: contact.msmeCategory,
      tanNo: contact.tanNo,
      tdsAvailable: contact.tdsAvailable,
      tcsAvailable: contact.tcsAvailable,
      openingBalance: contact.openingBalance,
      creditLimit: contact.creditLimit,
      website: contact.website,
      description: contact.description,
      status: contact.isActive ? "active" : "suspend",
      isActive: contact.isActive,
      emails: withPrimary(contact.emails, email, (value) => ({
        id: 0,
        email: value,
        emailType: "Primary",
        isPrimary: true,
        sortOrder: 1
      })),
      phones: withPrimary(contact.phones, mobile, (value) => ({
        id: 0,
        phone: value,
        phoneType: "Mobile",
        isPrimary: true,
        sortOrder: 1
      })),
      addresses: contact.addresses,
      bankAccounts: contact.bankAccounts,
      socialLinks: contact.socialLinks
    });
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the contact details.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(parsed.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save contact.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Edit contact</DialogTitle>
        <DialogDescription>Changes also appear in Core Contacts.</DialogDescription>
      </DialogHeader>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <WorkspaceFormField label="Mobile no">
        <Input type="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} />
      </WorkspaceFormField>
      <WorkspaceFormField label="Contact name" required>
        <Input value={name} maxLength={191} onChange={(event) => setName(event.target.value)} />
      </WorkspaceFormField>
      <WorkspaceFormField label="Company name">
        <Input value={legalName} onChange={(event) => setLegalName(event.target.value)} />
      </WorkspaceFormField>
      <WorkspaceFormField label="Email">
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </WorkspaceFormField>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save contact"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function primaryValue<Item extends { isPrimary: boolean }>(items: Item[], fallback: string | null) {
  const primary = items.find((item) => item.isPrimary);
  if (primary && "phone" in primary) return String(primary.phone);
  if (primary && "email" in primary) return String(primary.email);
  return fallback ?? "";
}

function withPrimary<Item extends ContactPhone | ContactEmail>(
  items: Item[],
  value: string,
  create: (value: string) => Item
): Item[] {
  const trimmed = value.trim();
  const primaryIndex = items.findIndex((item) => item.isPrimary);
  if (primaryIndex < 0) return trimmed ? [create(trimmed), ...items] : items;
  if (!trimmed) return items.filter((_, index) => index !== primaryIndex);
  return items.map((item, index) =>
    index === primaryIndex
      ? ({ ...item, ...("phone" in item ? { phone: trimmed } : { email: trimmed }) } as Item)
      : item
  );
}
