import { sql } from "kysely";
import { getCoreDatabase, runWithCoreDatabase } from "../../../database/core-database.js";
import { ContactService } from "./contact.service.js";

export async function getActiveContactForDatabase(databaseName: string, id: number) {
  const result = await sql<{ name: string }>`
    SELECT name FROM core_contacts WHERE id = ${id} AND status = 'active' LIMIT 1
  `.execute(getCoreDatabase(databaseName));
  return result.rows[0] ?? null;
}

export function resolveOrCreateCustomerForDatabase(
  databaseName: string,
  input: { name: string | null; mobile: string | null }
) {
  return runWithCoreDatabase(databaseName, () =>
    new ContactService().resolveOrCreateCustomer(input.name, input.mobile)
  );
}
