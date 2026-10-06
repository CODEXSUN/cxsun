import { z } from "zod";

export const statusSchema = z.object({
  name: z.string().trim().min(1, "Status name is required.").max(120),
  sortOrder: z.number().int().min(0).max(1000000)
});
