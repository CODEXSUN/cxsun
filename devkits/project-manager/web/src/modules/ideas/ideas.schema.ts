import { z } from "zod";

export const ideaSaveSchema = z
  .object({
    assignee: z.string().trim().max(191),
    category: z.enum(["general", "product", "engineering", "design", "research"]),
    content: z.string().max(1_000_000),
    status: z.enum([
      "draft",
      "open",
      "planning",
      "in-progress",
      "blocked",
      "completed",
      "archived"
    ]),
    title: z.string().trim().min(1, "Add a title to save this idea.").max(255)
  })
  .strict();
