import { sql } from "kysely";
import { AppError } from "@cxsun/framework/errors";
import { withBillingScope } from "../../auth/billing-scope.js";
import { getBillingDatabase } from "../../database/billing-database.js";

type AssistantScope = {
  tenantDatabase: string;
  actorEmail: string;
  companyId: number;
  financialYearId: number;
};

type PeriodRow = {
  kind: "sales" | "purchase" | "receipt" | "payment";
  currency_code: string;
  document_count: string | number;
  amount: string | number;
};

type AgedSaleRow = {
  document_kind: "sale" | "export-sale";
  invoice_number: string;
  customer_name: string;
  currency_code: string;
  issued_on: string;
  days_old: number;
  amount_due: string | number;
};

export async function lookupBillingPeriod(input: AssistantScope & { period: "today" | "month" }) {
  return withBillingScope(input, async () => {
    const database = await getBillingDatabase(input.tenantDatabase);
    const scope = await readScopeNames(database, input);
    const start =
      input.period === "today" ? sql`CURRENT_DATE()` : sql`DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')`;
    const end =
      input.period === "today"
        ? sql`CURRENT_DATE() + INTERVAL 1 DAY`
        : sql`DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') + INTERVAL 1 MONTH`;
    const result = await sql<PeriodRow>`
      SELECT kind, currency.name currency_code, COUNT(*) document_count,
        COALESCE(SUM(amount), 0) amount
      FROM (
        SELECT 'sales' kind, issued_on document_date, amount, currency_id FROM billing_sales
          WHERE company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
            AND status='confirmed' AND deleted_at IS NULL
        UNION ALL SELECT 'sales', issued_on, amount, currency_id FROM billing_export_sales
          WHERE company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
            AND status='confirmed' AND deleted_at IS NULL
        UNION ALL SELECT 'purchase', purchase_date, amount, currency_id FROM billing_purchases
          WHERE company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
            AND status='confirmed' AND deleted_at IS NULL
        UNION ALL SELECT 'receipt', receipt_date, total_amount, currency_id FROM billing_receipts
          WHERE company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
            AND status='posted' AND deleted_at IS NULL
        UNION ALL SELECT 'payment', payment_date, total_amount, currency_id FROM billing_payments
          WHERE company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
            AND status='posted' AND deleted_at IS NULL
      ) documents JOIN core_currencies currency ON currency.id=documents.currency_id
      WHERE document_date >= ${start} AND document_date < ${end}
      GROUP BY kind, currency.name
    `.execute(database);
    const dates = await sql<{ period_start: string; period_end: string }>`SELECT
      DATE_FORMAT(${start}, '%Y-%m-%d') period_start,
      DATE_FORMAT(${end} - INTERVAL 1 DAY, '%Y-%m-%d') period_end`.execute(database);
    const totals = Object.fromEntries(
      ["sales", "purchase", "receipt", "payment"].map((kind) => {
        const rows = result.rows.filter((item) => item.kind === kind);
        return [
          kind,
          {
            count: rows.reduce((total, row) => total + Number(row.document_count), 0),
            amounts: rows.map((row) => ({
              currency: row.currency_code,
              amount: Number(row.amount)
            }))
          }
        ];
      })
    ) as Record<
      PeriodRow["kind"],
      { count: number; amounts: Array<{ currency: string; amount: number }> }
    >;
    return {
      period: input.period,
      ...scope,
      start: dates.rows[0]!.period_start,
      end: dates.rows[0]!.period_end,
      totals
    };
  });
}

export async function lookupLongOutstandingSales(input: AssistantScope) {
  return withBillingScope(input, async () => {
    const database = await getBillingDatabase(input.tenantDatabase);
    const scope = await readScopeNames(database, input);
    const result = await sql<AgedSaleRow>`
      SELECT document_kind, invoice_number, customer_name, currency_code, issued_on, days_old, amount_due FROM (
        SELECT 'sale' document_kind, sale.invoice_number, contact.name customer_name, currency.name currency_code,
          DATE_FORMAT(sale.issued_on, '%Y-%m-%d') issued_on,
          DATEDIFF(CURRENT_DATE(), sale.issued_on) days_old,
          sale.amount - COALESCE((SELECT SUM(allocation.allocated_amount)
            FROM billing_receipt_allocations allocation
            JOIN billing_receipts receipt ON receipt.id=allocation.receipt_id
            WHERE allocation.sales_id=sale.id AND receipt.status='posted'
              AND receipt.deleted_at IS NULL AND receipt.company_id=${input.companyId}
              AND receipt.financial_year_id=${input.financialYearId}
              AND receipt.receipt_date<=CURRENT_DATE()), 0) amount_due
        FROM billing_sales sale JOIN core_contacts contact ON contact.id=sale.customer_id
          JOIN core_currencies currency ON currency.id=sale.currency_id
        WHERE sale.company_id=${input.companyId} AND sale.financial_year_id=${input.financialYearId}
          AND sale.status='confirmed' AND sale.deleted_at IS NULL
          AND sale.issued_on <= CURRENT_DATE() - INTERVAL 30 DAY
        UNION ALL
        SELECT 'export-sale', sale.invoice_number, contact.name, currency.name, DATE_FORMAT(sale.issued_on, '%Y-%m-%d'),
          DATEDIFF(CURRENT_DATE(), sale.issued_on),
          sale.amount - COALESCE((SELECT SUM(allocation.allocated_amount)
            FROM billing_receipt_export_allocations allocation
            JOIN billing_receipts receipt ON receipt.id=allocation.receipt_id
            WHERE allocation.export_sales_id=sale.id AND receipt.status='posted'
              AND receipt.deleted_at IS NULL AND receipt.company_id=${input.companyId}
              AND receipt.financial_year_id=${input.financialYearId}
              AND receipt.receipt_date<=CURRENT_DATE()), 0)
        FROM billing_export_sales sale JOIN core_contacts contact ON contact.id=sale.customer_id
          JOIN core_currencies currency ON currency.id=sale.currency_id
        WHERE sale.company_id=${input.companyId} AND sale.financial_year_id=${input.financialYearId}
          AND sale.status='confirmed' AND sale.deleted_at IS NULL
          AND sale.issued_on <= CURRENT_DATE() - INTERVAL 30 DAY
      ) open_sales
      WHERE amount_due > 0.005 AND days_old >= 30
      ORDER BY days_old DESC, amount_due DESC LIMIT 10
    `.execute(database);
    const date = await sql<{
      today: string;
    }>`SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') today`.execute(database);
    return {
      asOf: date.rows[0]!.today,
      ...scope,
      minimumDays: 30,
      limit: 10,
      items: result.rows.map((row) => ({
        invoiceNumber: row.invoice_number,
        documentKind: row.document_kind,
        customerName: row.customer_name,
        currency: row.currency_code,
        issuedOn: row.issued_on,
        daysOld: Number(row.days_old),
        amountDue: Number(row.amount_due)
      }))
    };
  });
}

async function readScopeNames(
  database: Awaited<ReturnType<typeof getBillingDatabase>>,
  input: AssistantScope
) {
  const result = await sql<{ company_name: string; financial_year_name: string }>`
    SELECT company.name company_name, financial_year.name financial_year_name
    FROM core_companies company JOIN core_financial_years financial_year ON financial_year.id=${input.financialYearId}
    WHERE company.id=${input.companyId} AND company.status='active' AND financial_year.status='active'
    LIMIT 1`.execute(database);
  const row = result.rows[0];
  if (!row) throw AppError.validation("Select an active company and financial year.");
  return { companyName: row.company_name, financialYearName: row.financial_year_name };
}
