import { z } from "zod";

export const auditorClientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(191),
  companyName: z.string().trim().max(191).nullable(),
  ownerName: z.string().trim().max(191).nullable(),
  mobile: z.string().trim().max(80).nullable(),
  email: z.email("Enter a valid email address.").max(191).nullable(),
  gstin: z.string().trim().max(15).nullable(),
  status: z.enum(["active", "inactive"])
});
