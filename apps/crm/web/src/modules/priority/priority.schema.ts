import { z } from "zod";

export const prioritySchema = z.object({
  name: z.string().trim().min(1, "Priority name is required.").max(120),
  sortOrder: z.number().int().min(0).max(1000000)
});
