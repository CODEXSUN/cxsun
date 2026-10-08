import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { ContactForm } from "./contact.form";
import {
  contactLookupsQueryKey,
  contactsQueryKey,
  useContactLookups,
  useContacts
} from "./contact.hooks";
import { ContactList } from "./contact.list";
import {
  createContact,
  createAddressTypeLookup,
  createBankNameLookup,
  createCityLookup,
  createContactGroupLookup,
  createContactTypeLookup,
  createCountryLookup,
  createDistrictLookup,
  createPincodeLookup,
  createStateLookup,
  forceDeleteContact,
  getNextContactCode,
  setContactActive,
  updateContact
} from "./contact.services";
import type {
  ContactLookupCreate,
  ContactLookups,
  ContactRecord,
  ContactSavePayload
} from "./contact.types";

const emptyLookups: ContactLookups = {
  contactTypes: [],
  contactGroups: [],
  addressTypes: [],
  bankNames: [],
  countries: [],
  states: [],
  districts: [],
  cities: [],
  pincodes: []
};
export function ContactWorkspace({ basePath = "/app/core/master/contact" }: { basePath?: string }) {
  const client = useQueryClient(),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [rowsPerPage, setRowsPerPage] = useState(100),
    [editing, setLocalEditing] = useState<ContactRecord | null | undefined>(undefined),
    [newCode, setNewCode] = useState(""),
    query = useContacts(search),
    lookupsQuery = useContactLookups(),
    records = query.data ?? [];
  const location = useLocation();
  const navigate = useNavigate();
  function setEditing(record: ContactRecord | null | undefined) {
    setLocalEditing(record);
    const path =
      record === undefined
        ? basePath
        : record === null
          ? `${basePath}/new`
          : `${basePath}/${encodeURIComponent(record.id)}/edit`;
    if (location.pathname !== path) void navigate({ to: path });
  }
  useEffect(() => {
    const tail = location.pathname.slice(basePath.length).split("/").filter(Boolean);
    if (tail.length === 0) {
      setLocalEditing(undefined);
      return;
    }
    if (tail[0] === "new" && tail.length === 1) {
      setLocalEditing(null);
      return;
    }
    if (tail.length > 2 || (tail[1] && tail[1] !== "edit")) return;
    let id: string;
    try {
      id = decodeURIComponent(tail[0]!);
    } catch {
      return;
    }
    const record = query.data?.find((entry) => String(entry.id) === id);
    setLocalEditing((current) =>
      current && record && current.id === record.id ? current : record
    );
  }, [basePath, location.pathname, query.data]);
  const totalPages = Math.max(1, Math.ceil(records.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = records.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const save = useMutation({
    mutationFn: (payload: ContactSavePayload) =>
      editing ? updateContact(editing.id, payload) : createContact(payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactsQueryKey });
      toast.success("Contact saved");
      setNewCode("");
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save contact", { description: error.message })
  });
  const generateCode = useMutation({
    mutationFn: getNextContactCode,
    onSuccess: ({ code }) => {
      setNewCode(code);
      setEditing(null);
    },
    onError: (error) =>
      toast.error("Unable to generate contact code", { description: error.message })
  });
  useEffect(() => {
    if (
      location.pathname !== `${basePath}/new` ||
      newCode ||
      generateCode.isPending ||
      generateCode.isError
    )
      return;
    generateCode.mutate();
  }, [basePath, location.pathname, newCode, generateCode.isPending, generateCode.isError]);
  const action = useMutation({
    mutationFn: ({ record, type }: { record: ContactRecord; type: "delete" | "toggle" }) =>
      type === "delete"
        ? forceDeleteContact(record.id)
        : setContactActive(record.id, !record.isActive),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactsQueryKey });
    },
    onError: (error) => toast.error("Unable to update contact", { description: error.message })
  });
  const refreshLookups = async <Record,>(work: () => Promise<Record>) => {
    const record = await work();
    await client.invalidateQueries({ queryKey: contactLookupsQueryKey });
    return record;
  };
  const createLookup: ContactLookupCreate = {
    contactType: (name) => refreshLookups(() => createContactTypeLookup(name)),
    contactGroup: (name) => refreshLookups(() => createContactGroupLookup(name)),
    addressType: (name) => refreshLookups(() => createAddressTypeLookup(name)),
    bankName: (name) => refreshLookups(() => createBankNameLookup(name)),
    country: (name) => refreshLookups(() => createCountryLookup(name)),
    state: (name, countryId) => refreshLookups(() => createStateLookup(name, countryId)),
    district: (name, stateId) => refreshLookups(() => createDistrictLookup(name, stateId)),
    city: (name, districtId) => refreshLookups(() => createCityLookup(name, districtId)),
    pincode: (postalCode, area, cityId) =>
      refreshLookups(() => createPincodeLookup(postalCode, area, cityId))
  };
  if (editing !== undefined)
    return (
      <ContactForm
        createLookup={createLookup}
        error={save.error?.message ?? ""}
        loading={save.isPending}
        lookups={lookupsQuery.data ?? emptyLookups}
        lookupsLoading={lookupsQuery.isLoading}
        nextCode={newCode}
        record={editing}
        onBack={() => {
          setNewCode("");
          setEditing(undefined);
        }}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  return (
    <WorkspacePage
      title="Contacts"
      description="Manage contact identity, tax, communication, address, finance, and lifecycle details."
      actions={
        <div className="flex gap-2">
          <Button disabled={generateCode.isPending} onClick={() => generateCode.mutate()}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchPlaceholder="Search code, contact, phone, or email"
        searchValue={search}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
      <ContactList
        loading={query.isFetching && !query.data}
        records={visibleRecords}
        onEdit={setEditing}
        onForceDelete={(record) => {
          if (confirm(`Force delete ${record.name}?`)) action.mutate({ record, type: "delete" });
        }}
        onToggle={(record) => action.mutate({ record, type: "toggle" })}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, records.length)}
        singularLabel="contact"
        totalCount={records.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
    </WorkspacePage>
  );
}
