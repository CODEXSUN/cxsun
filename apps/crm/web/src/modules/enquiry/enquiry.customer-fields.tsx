import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { ContactQuickEditDialog } from "@cxsun/core-web/modules/master/contact";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceLookup } from "@cxsun/ui/workspace/lookup";
import { WorkspaceFormField } from "@cxsun/ui/workspace/upsert";
import type { EnquiryLookup, EnquirySavePayload } from "./enquiry.types";

type CustomerValue = Pick<EnquirySavePayload, "contactId" | "capturedName" | "capturedPhone">;

export function EnquiryCustomerFields({
  contacts,
  loading,
  value,
  error,
  mobileError,
  onChange,
  onContactSaved
}: {
  contacts: EnquiryLookup[];
  loading: boolean;
  value: CustomerValue;
  error: string;
  mobileError: string;
  onChange: (next: Partial<CustomerValue>) => void;
  onContactSaved: () => Promise<void>;
}) {
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [manualName, setManualName] = useState(
    Boolean(value.capturedName && value.capturedName !== value.capturedPhone && !value.contactId)
  );
  const matches = useMemo(
    () => matchingContacts(contacts, value.capturedPhone),
    [contacts, value.capturedPhone]
  );

  useEffect(() => {
    if (value.contactId || matches.length !== 1) return;
    onChange({ contactId: matches[0]!.id, capturedName: null });
  }, [matches, onChange, value.contactId]);

  const options = contacts
    .filter((contact) => contact.status === "active")
    .sort((left, right) => Number(matches.includes(right)) - Number(matches.includes(left)))
    .map((contact) => ({
      value: String(contact.id),
      label: contact.name,
      ...(contact.primaryPhone ? { description: contact.primaryPhone } : {})
    }));
  const mobileDigits = phoneKey(value.capturedPhone);
  const selectedContact = contacts.find((contact) => contact.id === value.contactId);

  return (
    <>
      <WorkspaceFormField label="Mobile no">
        <Input
          type="tel"
          autoComplete="tel"
          aria-invalid={Boolean(mobileError)}
          value={value.capturedPhone ?? ""}
          onChange={(event) => {
            const mobile = event.target.value;
            const found = matchingContacts(contacts, mobile);
            if (found.length === 1) {
              setManualName(false);
              onChange({ capturedPhone: mobile, contactId: found[0]!.id, capturedName: null });
            } else {
              onChange({
                capturedPhone: mobile,
                contactId: null,
                capturedName: manualName ? value.capturedName : mobile || null
              });
            }
          }}
        />
        {mobileError ? <p className="text-xs text-destructive">{mobileError}</p> : null}
        {mobileDigits.length >= 7 ? (
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Searching Core contacts..."
              : matches.length === 1
                ? `Matched Core contact: ${matches[0]!.name}`
                : matches.length > 1
                  ? "Several contacts use this mobile. Choose the customer below."
                  : "A new Core contact will be created when you save."}
          </p>
        ) : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Customer" required>
        <WorkspaceLookup
          allowTextValue
          options={options}
          placeholder="Search or enter customer"
          value={value.contactId ? String(value.contactId) : (value.capturedName ?? "")}
          invalid={Boolean(error)}
          trailingAction={
            selectedContact ? (
              <button
                aria-label="Edit selected contact"
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Edit selected contact"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingContactId(selectedContact.id);
                }}
              >
                <ArrowUpRight className="size-4" />
              </button>
            ) : undefined
          }
          onValueChange={(selected, option) => {
            const contact = option
              ? contacts.find((item) => item.id === Number(option.value))
              : null;
            setManualName(
              Boolean(!option && selected.trim() && selected.trim() !== value.capturedPhone)
            );
            onChange({
              contactId: contact?.id ?? null,
              capturedName: contact ? null : selected || value.capturedPhone || null,
              capturedPhone: value.capturedPhone || contact?.primaryPhone || null
            });
          }}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </WorkspaceFormField>
      <ContactQuickEditDialog
        contactId={editingContactId}
        onOpenChange={(open) => !open && setEditingContactId(null)}
        onSaved={async (contact) => {
          onChange({
            contactId: contact.id,
            capturedName: null,
            capturedPhone: contact.primaryPhone
          });
          await onContactSaved();
        }}
      />
    </>
  );
}

function matchingContacts(contacts: EnquiryLookup[], mobile: string | null) {
  const key = phoneKey(mobile);
  if (key.length < 7) return [];
  return contacts.filter(
    (contact) =>
      contact.status === "active" &&
      [contact.primaryPhone, ...(contact.phones ?? []).map((item) => item.phone)].some(
        (phone) => phoneKey(phone) === key
      )
  );
}

function phoneKey(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}
