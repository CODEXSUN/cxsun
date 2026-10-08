import { z } from "zod";

export const saveUserMappingSchema = z.object({
  localUserId: z.number().int().positive(),
  frappeUserId: z.string().trim().min(1).max(191)
});
