# CRM enquiry

The CRM enquiry list opens a detail page when a row or enquiry ID is selected. The detail page shows the Core contact, an optional WhatsApp link based on the contact or captured mobile number, and four tabs: Comments, Jobs, Estimate, and Activity. The Properties card edits list, priority, assignee, schedule date, and status inline. The original enquiry message is kept as the first comment for enquiries created before comments were introduced.

## Personal workspaces

CRM has Overview, My Job, My Calls, and All Enquiries pages. My Job shows enquiries assigned to the signed-in tenant user; My Calls shows enquiries whose `created_by` email matches the signed-in user. Overview uses the same records for live workload and status counts. The sidebar shows counts for each page. List filter options show counts within the current page scope, and the selected filter appears beside search.

`GET /crm/enquiries/overview-activity` counts comments written by the signed-in user in the last 30 days. The overview shows a dash for reactions because CRM does not store reactions.

New enquiries show a **New call** action in the Enquiry details column. `POST /crm/enquiries/:id/open-new-call` atomically changes a New enquiry to Open, posts the plain-text comment `New call opened`, and records activity. A concurrent or repeated request cannot add another opening comment because the status update requires the current New status.

## Data ownership

CRM stores enquiries, comments, jobs, estimates, activity, the enquiry number sequence, and three reference masters in the tenant database. Contacts remain in Core. Manual job employees reference active tenant users; estimate vendors reference Core contacts. CRM migrations create and reconcile the child tables, including the employee reference on an existing jobs table. Every child record belongs to one enquiry.

## Enquiry reference masters

The CRM **Common** menu opens separate List In, Status, and Priority pages. Each page supports search, creation, editing, activation, suspension, and removal of unused records. List In starts with Accounts, office, Stores, and Services. Status starts with New, Open, Won, Lost, Hold for Approval, Long Hold, Hold for Spares, Closed, Hold for Job-Out, Escalation, and Re-open. Priority starts with Low, Normal, High, and Urgent. Their codes stay stable when display names change. Unused older default statuses remain inactive so existing references are preserved. Priority choices use blue, teal, amber, and red dots; status choices and badges follow the status color template.

Enquiries save `list_in_id`, `status_id`, and `priority_id` foreign keys. List In is optional; Status and Priority are required. The form and inline property editor submit master IDs, while list and detail responses join the current display names. A master record used by an enquiry cannot be suspended or deleted. CRM seeds separate permission keys for viewing, creating, updating, and deleting each master. Enquiry viewers can read the master choices; master changes require the corresponding master permission.

In the enquiry form and detail Properties card, List In, Status, and Priority are searchable lookups. Typing a new name shows an inline Create action. The action saves through the corresponding master API, refreshes its lookup, and selects the new record. A failed create leaves the field unselected and shows the API error in the lookup. The detail Properties card still requires its Save button to link the new choice to the enquiry.

The migration creates the three master tables before adding enquiry foreign keys. It imports existing List In, Status, and Priority text values, backfills references, and retains the old text columns for compatibility; new writes use the foreign keys.

## Detail actions

- Comments and replies are saved under `/crm/enquiries/:id/comments`. Formatted comments are sanitized by the API before storage and rendering.
- Jobs are listed at `/crm/enquiries/:id/jobs`. Users can start or stop a timer, or enter and edit time, employee, rate, and status manually. The API calculates duration and cost and prevents a second running job on the same enquiry.
- Estimates are listed at `/crm/enquiries/:id/estimates`. Users can create or edit an item, date, Core contact vendor, and price.
- Activity is read from `/crm/enquiries/:id/activity`. Enquiry creation and edits, comments, jobs, and estimates add entries in the same database transaction as the change.
- Inline property edits use `PATCH /crm/enquiries/:id/properties`; unchanged values do not create activity.

Child write routes require CRM enquiry update access. Only `POST /crm/enquiries` uses enquiry creation access.
