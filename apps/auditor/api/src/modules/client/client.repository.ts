import type { Kysely, Selectable } from "kysely";
import type {
  AuditorClientDatabase,
  AuditorClientInput,
  AuditorClientRecord,
  AuditorClientRow,
  AuditorCredentialPortal
} from "./client.types.js";

export class AuditorClientRepository {
  constructor(private readonly database: Kysely<AuditorClientDatabase>) {}

  async list(search = "") {
    let query = this.database.selectFrom("auditor_clients").selectAll();
    if (search) {
      const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      query = query.where((expression) =>
        expression.or([
          expression("name", "like", term),
          expression("company_name", "like", term),
          expression("owner_name", "like", term),
          expression("email", "like", term),
          expression("mobile", "like", term),
          expression("gstin", "like", term)
        ])
      );
    }
    return (await query.orderBy("name").orderBy("id").execute()).map(toRecord);
  }

  async get(id: number) {
    const row = await this.database
      .selectFrom("auditor_clients")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: AuditorClientInput, actor: string) {
    const result = await this.database
      .insertInto("auditor_clients")
      .values({ ...inputToRow(input), created_by: actor })
      .executeTakeFirstOrThrow();
    return this.get(Number(result.insertId));
  }

  async update(id: number, input: AuditorClientInput) {
    await this.database
      .updateTable("auditor_clients")
      .set(inputToRow(input))
      .where("id", "=", id)
      .execute();
    return this.get(id);
  }

  listCredentials(clientId: number) {
    return this.database
      .selectFrom("auditor_client_credentials")
      .select(["portal", "username", "password_secret", "updated_at"])
      .where("client_id", "=", clientId)
      .where("status", "=", "active")
      .execute();
  }

  getCredential(clientId: number, portal: AuditorCredentialPortal) {
    return this.database
      .selectFrom("auditor_client_credentials")
      .selectAll()
      .where("client_id", "=", clientId)
      .where("portal", "=", portal)
      .where("status", "=", "active")
      .executeTakeFirst();
  }

  async upsertCredential(
    clientId: number,
    portal: AuditorCredentialPortal,
    username: string,
    passwordSecret: string,
    actor: string
  ) {
    await this.database
      .insertInto("auditor_client_credentials")
      .values({
        client_id: clientId,
        portal,
        username,
        password_secret: passwordSecret,
        created_by: actor,
        status: "active"
      })
      .onDuplicateKeyUpdate({ username, password_secret: passwordSecret, status: "active" })
      .execute();
    return this.getCredential(clientId, portal);
  }
}

function inputToRow(input: AuditorClientInput) {
  return {
    name: input.name,
    company_name: input.companyName,
    owner_name: input.ownerName,
    mobile: input.mobile,
    email: input.email,
    gstin: input.gstin,
    status: input.status
  };
}

function toRecord(row: Selectable<AuditorClientRow>): AuditorClientRecord {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    companyName: row.company_name,
    ownerName: row.owner_name,
    mobile: row.mobile,
    email: row.email,
    gstin: row.gstin,
    status: row.status,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(text.endsWith("Z") ? text : `${text}Z`).toISOString();
}
