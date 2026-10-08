import { withBillingScope } from "../../../auth/billing-scope.js";
import { sql } from "kysely";
import { getBillingDatabase } from "../../../database/billing-database.js";
import { CustomerSummaryService } from "./customer-summary.service.js";

/** Narrow read contract for authorized business assistants. No arbitrary SQL or writes. */
export async function lookupCustomerOutstanding(input: {
  tenantDatabase: string;
  actorEmail: string;
  companyId: number;
  financialYearId: number;
  contact: string;
}) {
  return withBillingScope(
    {
      actorEmail: input.actorEmail,
      companyId: input.companyId,
      financialYearId: input.financialYearId
    },
    async () => {
      const database = await getBillingDatabase(input.tenantDatabase);
      const contact = input.contact.trim().toLocaleLowerCase();
      const candidates = await sql<{ id: number }>`SELECT contact.id FROM core_contacts contact
      WHERE contact.deleted_at IS NULL AND contact.status='active'
        AND (LOWER(contact.code)=${contact} OR LOWER(contact.name)=${contact})
        AND (
          EXISTS (SELECT 1 FROM billing_opening_balances opening
            WHERE opening.contact_id=contact.id AND opening.party_role='customer'
              AND opening.company_id=${input.companyId} AND opening.financial_year_id=${input.financialYearId})
          OR EXISTS (SELECT 1 FROM billing_sales sale WHERE sale.customer_id=contact.id
            AND sale.company_id=${input.companyId} AND sale.financial_year_id=${input.financialYearId}
            AND sale.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM billing_export_sales sale WHERE sale.customer_id=contact.id
            AND sale.company_id=${input.companyId} AND sale.financial_year_id=${input.financialYearId}
            AND sale.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM billing_receipts receipt WHERE receipt.customer_id=contact.id
            AND receipt.company_id=${input.companyId} AND receipt.financial_year_id=${input.financialYearId}
            AND receipt.deleted_at IS NULL)
        ) LIMIT 3`.execute(database);
      const summary = await new CustomerSummaryService().get(
        input.tenantDatabase,
        input.companyId,
        candidates.rows.length === 1 ? Number(candidates.rows[0]!.id) : 0
      );
      const ids = new Set(candidates.rows.map((row) => Number(row.id)));
      const matches = summary.items.filter((item) => ids.has(item.id));
      return {
        ambiguous: candidates.rows.length > 1,
        companyName: summary.companyName,
        financialYearName: summary.financialYearName,
        matches: matches.map(({ id, code, name, balance }) => ({ id, code, name, balance }))
      };
    }
  );
}
