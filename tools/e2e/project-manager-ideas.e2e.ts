import assert from "node:assert/strict";
import type { Kysely } from "kysely";
import {
  closePlatformDatabase,
  getPlatformDatabase,
  migratePlatformDatabase
} from "../../apps/platform/api/src/database/platform-database.js";
import {
  runWithProjectManagerDatabase,
  type ProjectManagerDatabase
} from "../../devkits/project-manager/api/src/database/project-manager-database.js";
import { IdeasService } from "../../devkits/project-manager/api/src/modules/ideas/ideas.service.js";

await migratePlatformDatabase();
const database = getPlatformDatabase() as unknown as Kysely<ProjectManagerDatabase>;
let createdUuid = "";

try {
  await runWithProjectManagerDatabase(database, async () => {
    const service = new IdeasService();
    const created = await service.create(
      {
        assignee: "reviewer@example.com",
        category: "product",
        content: "<p>A safer proposal</p><script>alert(1)</script>",
        status: "draft",
        title: "  Verify ideas persistence  "
      },
      "test@example.com"
    );
    createdUuid = created.uuid;
    assert.equal(created.title, "Verify ideas persistence");
    assert.equal(created.content.includes("<script"), false);
    assert.ok((await service.list()).some((idea) => idea.uuid === createdUuid));

    const updated = await service.update(
      createdUuid,
      {
        assignee: "reviewer@example.com",
        category: "engineering",
        content: "<p>Revised proposal</p>",
        status: "open",
        title: "Verify ideas persistence"
      },
      "test@example.com"
    );
    assert.equal(updated.category, "engineering");
    assert.equal((await service.archive(createdUuid, "test@example.com")).status, "archived");

    const activity = await database
      .selectFrom("project_manager_ideas_activity")
      .selectAll()
      .where("idea_uuid", "=", createdUuid)
      .execute();
    assert.equal(activity.length, 3);
  });
  console.info("Project Manager ideas CRUD, sanitization, and audit E2E passed");
} finally {
  if (createdUuid) {
    await database
      .deleteFrom("project_manager_ideas_activity")
      .where("idea_uuid", "=", createdUuid)
      .execute();
    await database.deleteFrom("project_manager_ideas").where("uuid", "=", createdUuid).execute();
  }
  await closePlatformDatabase();
}
