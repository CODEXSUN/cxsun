import { z } from "zod";

export const listInSchema = z.object({
  name: z.string().trim().min(1, "List In name is required.").max(120),
  sortOrder: z.number().int().min(0).max(1000000)
});
