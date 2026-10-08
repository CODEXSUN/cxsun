import { z } from "zod";
import { caseKinds, caseSeverities } from "./cases.types.js";

export const createCaseSchema = z
  .object({
    kind: z.enum(caseKinds),
    severity: z.enum(caseSeverities),
    tenantId: z.number().int().positive().nullable(),
    title: z.string().trim().min(3, "Enter a title.").max(255),
    description: z
      .string()
      .trim()
      .min(10, "Describe the request in at least ten characters.")
      .max(20_000)
  })
  .refine((value) => value.kind !== "data_correction" || value.tenantId !== null, {
    message: "Choose the affected tenant for a data correction.",
    path: ["tenantId"]
  });
