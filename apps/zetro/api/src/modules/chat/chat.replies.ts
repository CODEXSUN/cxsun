import type {
  BillingPeriodLookup,
  CustomerOutstandingLookup,
  LongOutstandingSalesLookup
} from "./chat.service.js";

export function outstandingReply(result: Awaited<ReturnType<CustomerOutstandingLookup>>) {
  if (result.ambiguous) {
    return "More than one customer has that name. Please use the exact customer code.";
  }
  if (result.matches.length === 0) {
    return `I could not find an outstanding customer balance for that exact name or code in ${result.companyName}, ${result.financialYearName}. Check the name or code in Billing.`;
  }
  const customer = result.matches[0]!;
  const balance = Math.abs(customer.balance).toFixed(2);
  const description =
    customer.balance > 0
      ? `an outstanding balance of ${balance}`
      : `a credit balance of ${balance}`;
  return `${customer.name} (${customer.code}) has ${description} in ${result.companyName}, ${result.financialYearName}. Source: Billing customer summary. This is the current recorded balance, not a payment instruction.`;
}

export function periodReply(
  result: Awaited<ReturnType<BillingPeriodLookup>>,
  category: "sales" | "purchase" | "receipt" | "payment" | "all" | null
) {
  const selected =
    category && category !== "all"
      ? [category]
      : (["sales", "purchase", "receipt", "payment"] as const);
  const lines = selected.map((kind) => {
    const total = result.totals[kind];
    const amounts = total.amounts
      .map((item) => `${item.currency} ${item.amount.toFixed(2)}`)
      .join(", ");
    return `${kind === "sales" ? "Sales" : kind === "purchase" ? "Purchases" : kind === "receipt" ? "Receipts" : "Payments"}: ${total.count} documents${amounts ? `, ${amounts}` : ""}`;
  });
  return `${result.period === "today" ? "Today's report" : "This month's report"} for ${result.companyName}, ${result.financialYearName} (${result.start} to ${result.end}):\n${lines.join("\n")}\nSource: Billing. Sales include export sales. Counts include confirmed sales and purchases and posted receipts and payments.`;
}

export function agedSalesReply(result: Awaited<ReturnType<LongOutstandingSalesLookup>>) {
  if (!result.items.length) {
    return `No confirmed sales invoices aged ${result.minimumDays} days or more have an outstanding balance as of ${result.asOf} in ${result.companyName}, ${result.financialYearName}. Source: Billing.`;
  }
  const lines = result.items.map(
    (item) =>
      `${item.invoiceNumber} (${item.documentKind}) — ${item.customerName}: ${item.currency} ${item.amountDue.toFixed(2)} outstanding, ${item.daysOld} days old (issued ${item.issuedOn})`
  );
  return `Oldest outstanding sales as of ${result.asOf} (${result.minimumDays}+ days) in ${result.companyName}, ${result.financialYearName}:\n${lines.join("\n")}\nSource: Billing confirmed sales and posted receipt allocations. Showing up to ${result.limit} oldest invoices.`;
}
