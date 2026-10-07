# CRM Contact 360

CRM Contact 360 opens from the CRM **Contacts** menu. It selects an existing active Core contact as the customer. Core remains the owner of the contact's name, primary phone, email, address, tax, and other fields already present there. Contact 360 stores only additional CRM context. The Core **Master > Contact** page continues to edit Core records.

The page groups the CRM records into four tabs:

| Tab | Leaf modules and tables | Parent |
| --- | --- | --- |
| Identity | `contact_profiles`, `contact_people` | Core contact |
| Reach | `contact_communication`, `contact_preferences` | Person |
| Organization | `contact_employments`, `contact_roles`, `contact_relationships` | Person, except relationships also identify the customer |
| Insight | `contact_classifications`, `contact_tags`, `contact_person_tags`, `contact_notes`, `contact_lifecycle`, `contact_documents` | Person, except the shared tag library |

Each table has its own CRM API module with migration, permission seed, routes, validation service, repository, and types. Each editable section has its own CRM web types, service, query hook, and section. The Contact 360 workspace only composes these sections. Tenant database foreign keys point to `core_contacts`, `contact_people`, or `contact_tags` as appropriate. The industry selector points to the Platform industry master, which lives in a different database and is checked through the Platform industry service before a profile is saved.

The **Save** button at the top submits the visible section. **Ctrl+S** (or Command+S) does the same. Selecting another section does not save it. Inactive records remain visible in their section and can be activated again. Customer profiles, preferences, and classifications have one row per parent; other sections can hold multiple rows. The document section stores a file reference and metadata; it does not upload the file itself. Lifecycle events are append-only: the latest event is the person's CRM lifecycle status, while the People section controls whether the person record can be used as an active parent.

Permissions are module-specific (`crm.contact-<module>.view`, `.create`, `.update`) and seeded for the tenant admin role. CRM must also be enabled for the tenant. Existing enquiry and Core contact permissions remain separate.
