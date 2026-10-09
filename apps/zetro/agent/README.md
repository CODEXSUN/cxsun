# Zetro agent

`skills.md` is Zetro's versioned business rule source. The Zetro API loads it from
the repository in development and from the collected build output in production.
The API fails closed if the file is missing or empty. A SHA-256 hash of the loaded
rules is stored with each interaction log.

## What the rules control

The rules define Zetro's business terms, answer pattern, supported questions,
and limits. They guide the model's words. They do not grant database access.
The backend classifies each request and runs only a named, authorized skill.
The first record skill is `billing.customer-outstanding.read`.

Text files (`.txt`, `.md`, `.csv`, `.json`) up to 1 MB may be attached to a chat.
Zetro shows a local text preview before sending. The API scans the file and
records its hash, file facts, and a bounded text extract with the prompt in the
tenant conversation and interaction log. For files larger than the direct text
limit, Zetro analyzes every part in bounded model calls and combines those
analyses with selected excerpts. The full source is not retained in chat tables;
the answer must avoid claiming exact details absent from its summaries. File
analysis uses only `business_chat`.
File content never selects a Billing query or grants access to a business record.

## Numbered catalog

`skills.md` lists the live catalog using six fields: UUID, Serial #, Question
pattern, Query pattern, Limitation, and Extra. The tenant database mirrors the
six built-in entries in `zetro_query_patterns`. The UUID stays stable across
tenants. The serial number gives reviewers a short reference.

| UUID                                   | Serial # | Question pattern                       | Query pattern                       | Limitation                            | Extra                           |
| -------------------------------------- | -------: | -------------------------------------- | ----------------------------------- | ------------------------------------- | ------------------------------- |
| `010f0000-0000-4000-8000-000000000001` |        1 | Business help from user-provided facts | `business_chat`                     | No company record access              | Drafts and suggestions only     |
| `010f0000-0000-4000-8000-000000000002` |        2 | Exact customer outstanding             | `billing.customer-outstanding.read` | Grant and Billing permission required | Billing Customer Summary source |
| `010f0000-0000-4000-8000-000000000003` |        3 | Off-topic request                      | `none`                              | No data query                         | Short scope reply               |
| `010f0000-0000-4000-8000-000000000004` |        4 | Today's business report                | `billing.daily-summary.read`        | Grant and Billing permission required | Four dated totals               |
| `010f0000-0000-4000-8000-000000000005` |        5 | This month's transaction totals        | `billing.monthly-summary.read`      | Grant and Billing permission required | One category or all four        |
| `010f0000-0000-4000-8000-000000000006` |        6 | Long outstanding sales                 | `billing.aged-sales.read`           | Grant and Billing permission required | Ten oldest open invoices        |

Super Admin can see the tenant catalog and recent interaction logs at `/sa/zetro`.
The backend stores the matching pattern UUID with each interaction. A Super
Admin can add a numbered draft. A draft is only a proposal. To make it live,
add a fixed backend contract, update `skills.md` and the built-in catalog, and
review the permission and tests before release.

## Query and response pattern

1. Identify the business intent and required record identifier.
2. Check the signed user, tenant, role grant, application permission, and data scope.
3. Call a fixed read contract owned by the business module. Do not generate SQL.
4. Show the result with its source, company, financial year, and limits.
5. Record the prompt, result, skill decision, rule hash, and any tool event in the tenant database.

For customer outstanding, the Billing Customer Summary contract supplies the
amount. Zetro asks for an exact customer name or code when it cannot identify one
record. It never invents an amount or treats a recorded balance as payment advice.

Related wording maps to the same fixed contract. For example, “daily activity”
maps to #4. “Collections this month” maps to the receipt category in #5.
“Oldest unpaid invoices” maps to #6. The classifier selects an intent and a
permitted category. It cannot provide SQL or choose the tenant scope.

## Refinement

`zetro_interaction_logs` records completed and failed requests, including the
matching catalog UUID when classification succeeds. The existing
review notes and approval records let Super Admin inspect conversations and
denied skills. Reviewers use this evidence to propose a change to `skills.md`,
the classifier, or a module-owned skill. Each change needs a code review and
verification before release. Zetro does not train itself, change its own rules,
or activate a skill from chat content or a review note.

The tenant database stores conversation data and capability grants. The file
stores product rules. Future tenant business profiles may add approved terms,
but they cannot override these rules or backend permissions.
