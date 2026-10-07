import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Search } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceAnimatedTabs } from "@cxsun/ui/workspace/animated-tabs";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { ContactProfilesSection } from "../contact-profiles";
import { ContactPeopleSection, useContactPeople } from "../contact-people";
import { ContactCommunicationSection } from "../contact-communication";
import { ContactPreferencesSection } from "../contact-preferences";
import { ContactEmploymentsSection } from "../contact-employments";
import { ContactRolesSection } from "../contact-roles";
import { ContactRelationshipsSection } from "../contact-relationships";
import { ContactClassificationsSection } from "../contact-classifications";
import { ContactTagsSection, useContactTags } from "../contact-tags";
import { ContactPersonTagsSection } from "../contact-person-tags";
import { ContactNotesSection } from "../contact-notes";
import { ContactLifecycleSection } from "../contact-lifecycle";
import { ContactDocumentsSection } from "../contact-documents";
import { useContact360Customers } from "./contact-360.hooks";

const groups = [
  {
    id: "identity",
    name: "Identity",
    leaves: [
      { id: "profile", name: "Customer profile" },
      { id: "people", name: "People" }
    ]
  },
  {
    id: "reach",
    name: "Reach",
    leaves: [
      { id: "communication", name: "Communication" },
      { id: "preferences", name: "Preferences" }
    ]
  },
  {
    id: "organization",
    name: "Organization",
    leaves: [
      { id: "employment", name: "Employment" },
      { id: "roles", name: "Roles" },
      { id: "relationships", name: "Relationships" }
    ]
  },
  {
    id: "insight",
    name: "Insight",
    leaves: [
      { id: "classification", name: "Classification" },
      { id: "tags", name: "Tag library" },
      { id: "personTags", name: "Person tags" },
      { id: "notes", name: "Notes" },
      { id: "lifecycle", name: "Lifecycle" },
      { id: "documents", name: "Documents" }
    ]
  }
] as const;

type GroupId = (typeof groups)[number]["id"];
type LeafId = (typeof groups)[number]["leaves"][number]["id"];

export function Contact360Workspace() {
  const client = useQueryClient();
  const customers = useContact360Customers();
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState(0);
  const [personId, setPersonId] = useState(0);
  const [group, setGroup] = useState<GroupId>("identity");
  const [leaf, setLeaf] = useState<LeafId>("profile");
  const peopleQuery = useContactPeople(customerId);
  const tagsQuery = useContactTags(0);
  const people = peopleQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const customer = customers.data?.find((item) => item.id === customerId);
  const visibleCustomers = useMemo(
    () =>
      (customers.data ?? []).filter(
        (item) =>
          item.status === "active" &&
          `${item.name} ${item.primaryPhone ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase().trim())
      ),
    [customers.data, search]
  );

  useEffect(() => {
    if (people.length && !people.some((item) => item.id === personId && item.status === "active")) {
      setPersonId(people.find((item) => item.status === "active")?.id ?? 0);
    }
  }, [people, personId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        const form = document.getElementById("contact360-active-form") as HTMLFormElement | null;
        if (!form) return;
        event.preventDefault();
        form.requestSubmit();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function chooseCustomer(id: number) {
    setCustomerId(id);
    setPersonId(0);
    setGroup("identity");
    setLeaf("profile");
  }

  function chooseGroup(id: GroupId) {
    setGroup(id);
    setLeaf(groups.find((item) => item.id === id)!.leaves[0].id);
  }

  const parentId =
    leaf === "profile" || leaf === "people" || leaf === "relationships" ? customerId : personId;
  const needsPerson = !["profile", "people", "relationships", "tags"].includes(leaf);
  const canEdit = customerId > 0 && (!needsPerson || personId > 0);
  const onSaved = () => {
    void client.invalidateQueries({ queryKey: ["crm", "contact-people"] });
    void client.invalidateQueries({ queryKey: ["crm", "contact-tags"] });
  };
  const props = { parentId, people, tags, onSaved };
  const section = !canEdit ? (
    <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
      {customerId
        ? "Add or select a person in the People tab to continue."
        : "Select a Core contact to open Contact 360."}
    </div>
  ) : leaf === "profile" ? (
    <ContactProfilesSection {...props} />
  ) : leaf === "people" ? (
    <ContactPeopleSection {...props} />
  ) : leaf === "communication" ? (
    <ContactCommunicationSection {...props} />
  ) : leaf === "preferences" ? (
    <ContactPreferencesSection {...props} />
  ) : leaf === "employment" ? (
    <ContactEmploymentsSection {...props} />
  ) : leaf === "roles" ? (
    <ContactRolesSection {...props} />
  ) : leaf === "relationships" ? (
    <ContactRelationshipsSection {...props} />
  ) : leaf === "classification" ? (
    <ContactClassificationsSection {...props} />
  ) : leaf === "tags" ? (
    <ContactTagsSection {...props} />
  ) : leaf === "personTags" ? (
    <ContactPersonTagsSection {...props} />
  ) : leaf === "notes" ? (
    <ContactNotesSection {...props} />
  ) : leaf === "lifecycle" ? (
    <ContactLifecycleSection {...props} />
  ) : (
    <ContactDocumentsSection {...props} />
  );

  return (
    <WorkspacePage
      title="Contact 360"
      description="Customer context, people, communication, and relationship history linked to Core Contacts."
      actions={
        <Button form="contact360-active-form" type="submit" disabled={!canEdit}>
          <Save className="size-4" />
          Save <kbd className="ml-1 text-xs opacity-70">Ctrl+S</kbd>
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-card p-3 lg:self-start">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Find a Core contact"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="max-h-[68vh] space-y-1 overflow-y-auto">
            {customers.isLoading ? (
              <p className="px-2 text-sm text-muted-foreground">Loading contacts…</p>
            ) : null}
            {customers.isError ? (
              <p className="px-2 text-sm text-destructive">Unable to load Core contacts.</p>
            ) : null}
            {visibleCustomers.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseCustomer(item.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${item.id === customerId ? "bg-accent" : "hover:bg-muted"}`}
              >
                <span className="block truncate font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.primaryPhone ?? `Core #${item.id}`}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <main className="min-w-0 rounded-lg border bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">{customer?.name ?? "Select a customer"}</h2>
              {customer ? (
                <p className="text-xs text-muted-foreground">
                  Core contact #{customer.id} · {customer.primaryPhone ?? "No primary phone"}
                </p>
              ) : null}
            </div>
            {customerId && people.length ? (
              <label className="flex items-center gap-2 text-sm">
                Person
                <select
                  className="h-9 rounded-md border border-input bg-background px-2"
                  value={personId}
                  onChange={(event) => setPersonId(Number(event.target.value))}
                >
                  <option value={0}>Select person</option>
                  {people
                    .filter((item) => item.status === "active")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName ||
                          [item.firstName, item.lastName].filter(Boolean).join(" ")}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
          </div>
          <WorkspaceAnimatedTabs
            value={group}
            onValueChange={(value) => chooseGroup(value as GroupId)}
            tabs={groups.map((item) => ({
              value: item.id,
              label: item.name,
              content:
                item.id === group ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      {item.leaves.map((sub) => (
                        <Button
                          key={sub.id}
                          size="sm"
                          type="button"
                          variant={leaf === sub.id ? "default" : "outline"}
                          onClick={() => setLeaf(sub.id)}
                        >
                          {sub.name}
                        </Button>
                      ))}
                    </div>
                    {section}
                  </div>
                ) : null
            }))}
          />
        </main>
      </div>
    </WorkspacePage>
  );
}
