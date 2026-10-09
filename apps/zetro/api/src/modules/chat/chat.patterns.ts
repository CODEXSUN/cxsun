export const ZETRO_QUERY_PATTERNS = [
  {
    uuid: "010f0000-0000-4000-8000-000000000001",
    serialNo: 1,
    intent: "business_chat",
    questionPattern: "Business process, drafting, summary, or planning using user-provided facts",
    queryPattern: "business_chat",
    limitation: "No company record read or write",
    extra: "Ask for missing facts. Label drafts and suggestions."
  },
  {
    uuid: "010f0000-0000-4000-8000-000000000002",
    serialNo: 2,
    intent: "customer_outstanding",
    questionPattern: "What does an exact customer name or code owe or need to pay?",
    queryPattern: "billing.customer-outstanding.read",
    limitation: "Needs an active role grant and Billing permission; one exact customer only",
    extra: "Use Billing Customer Summary for the server-selected company and financial year."
  },
  {
    uuid: "010f0000-0000-4000-8000-000000000003",
    serialNo: 3,
    intent: "off_topic",
    questionPattern: "Entertainment or unrelated personal request",
    queryPattern: "none",
    limitation: "Business scope only; no data query",
    extra: "Give a short business-scope response."
  },
  {
    uuid: "010f0000-0000-4000-8000-000000000004",
    serialNo: 4,
    intent: "today_report",
    questionPattern:
      "Today's business report, activity, or totals across sales, purchases, receipts, and payments",
    queryPattern: "billing.daily-summary.read",
    limitation:
      "Active role grant and Billing records permission; current company and financial year only",
    extra: "Count confirmed sales and purchases and posted receipts and payments dated today."
  },
  {
    uuid: "010f0000-0000-4000-8000-000000000005",
    serialNo: 5,
    intent: "month_report",
    questionPattern:
      "This month's sales, purchases, receipts, or payments, individually or together",
    queryPattern: "billing.monthly-summary.read",
    limitation:
      "Active role grant and Billing records permission; current calendar month and scope only",
    extra: "Include export sales with sales. State the exact period and document statuses."
  },
  {
    uuid: "010f0000-0000-4000-8000-000000000006",
    serialNo: 6,
    intent: "long_outstanding_sales",
    questionPattern: "Oldest unpaid sales invoices or long outstanding sales",
    queryPattern: "billing.aged-sales.read",
    limitation:
      "Active role grant and Billing records permission; ten oldest invoices aged at least 30 days",
    extra: "Use posted receipt allocations and show invoice, customer, age, and remaining amount."
  }
] as const;

export const ZETRO_RECORD_CAPABILITIES = [
  "billing.customer-outstanding.read",
  "billing.daily-summary.read",
  "billing.monthly-summary.read",
  "billing.aged-sales.read"
] as const;

export type ZetroRecordCapability = (typeof ZETRO_RECORD_CAPABILITIES)[number];

export function patternUuidForIntent(intent: string) {
  return ZETRO_QUERY_PATTERNS.find((pattern) => pattern.intent === intent)?.uuid ?? null;
}
