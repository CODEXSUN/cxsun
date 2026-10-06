import { randomBytes } from "node:crypto";
import type { Insertable, Kysely, Selectable } from "kysely";
import { getProjectManagerDatabase } from "../../database/project-manager-database.js";
import type { ProjectManagerDatabase, ProjectManagerIdeasTable } from "../../database/schema.js";
import type { Idea, IdeaSavePayload } from "./ideas.types.js";

type IdeaRow = Selectable<ProjectManagerIdeasTable>;

export class IdeasRepository {
  private readonly database = getProjectManagerDatabase();

  async list(): Promise<Idea[]> {
    const rows = await this.database
      .selectFrom("project_manager_ideas")
      .selectAll()
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(toIdea);
  }

  async find(uuid: string): Promise<Idea | null> {
    return findIdea(this.database, uuid);
  }

  async create(input: IdeaSavePayload, actorEmail: string): Promise<Idea> {
    const values: Insertable<ProjectManagerIdeasTable> = {
      assignee: input.assignee,
      category: input.category,
      content_html: input.content,
      created_by: actorEmail,
      status: input.status,
      title: input.title,
      uuid: randomBytes(4).toString("hex")
    };
    return this.database.transaction().execute(async (transaction) => {
      await transaction.insertInto("project_manager_ideas").values(values).execute();
      await audit(transaction, values.uuid as string, "created", actorEmail);
      const created = await findIdea(transaction, values.uuid as string);
      if (!created) throw new Error("The saved idea could not be read.");
      return created;
    });
  }

  async update(uuid: string, input: IdeaSavePayload, actorEmail: string): Promise<Idea | null> {
    return this.database.transaction().execute(async (transaction) => {
      const result = await transaction
        .updateTable("project_manager_ideas")
        .set({
          assignee: input.assignee,
          category: input.category,
          content_html: input.content,
          status: input.status,
          title: input.title
        })
        .where("uuid", "=", uuid)
        .executeTakeFirst();
      if (!Number(result.numUpdatedRows)) return null;
      await audit(transaction, uuid, "updated", actorEmail);
      return findIdea(transaction, uuid);
    });
  }

  async archive(uuid: string, actorEmail: string): Promise<Idea | null> {
    return this.database.transaction().execute(async (transaction) => {
      const result = await transaction
        .updateTable("project_manager_ideas")
        .set({ status: "archived" })
        .where("uuid", "=", uuid)
        .executeTakeFirst();
      if (!Number(result.numUpdatedRows)) return null;
      await audit(transaction, uuid, "archived", actorEmail);
      return findIdea(transaction, uuid);
    });
  }
}

async function findIdea(database: Kysely<ProjectManagerDatabase>, uuid: string) {
  const row = await database
    .selectFrom("project_manager_ideas")
    .selectAll()
    .where("uuid", "=", uuid)
    .executeTakeFirst();
  return row ? toIdea(row) : null;
}

async function audit(
  database: Kysely<ProjectManagerDatabase>,
  ideaUuid: string,
  action: string,
  actorEmail: string
) {
  await database
    .insertInto("project_manager_ideas_activity")
    .values({
      action,
      actor_email: actorEmail,
      created_at: new Date(),
      created_by: actorEmail,
      idea_uuid: ideaUuid,
      status: "active",
      updated_at: new Date(),
      uuid: randomBytes(4).toString("hex")
    })
    .execute();
}

function toIdea(row: IdeaRow): Idea {
  return {
    assignee: row.assignee,
    category: row.category as Idea["category"],
    content: row.content_html,
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    id: Number(row.id),
    status: row.status as Idea["status"],
    title: row.title,
    updatedAt: new Date(row.updated_at).toISOString(),
    uuid: row.uuid
  };
}
