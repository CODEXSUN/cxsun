import { z } from "zod";

export const enquirySchema = z
  .object({
    title: z.string().trim().max(255),
    description: z.string().trim().nullable(),
    contactId: z.number().int().positive().nullable(),
    capturedName: z.string().trim().max(191).nullable(),
    capturedEmail: z.union([z.email("Enter a valid email address."), z.literal("")]).nullable(),
    capturedPhone: z.string().trim().max(80).nullable(),
    source: z.string().trim().min(1, "Source is required.").max(80),
    sourceReference: z.string().trim().max(191).nullable(),
    listInId: z.number().int().positive().nullable(),
    statusId: z.number().int().positive("Choose a status."),
    priorityId: z.number().int().positive("Choose a priority."),
    assignedUserId: z.number().int().positive().nullable(),
    enquiredAt: z.string().datetime({ offset: true }),
    dueDate: z.iso.date().nullable(),
    closedReason: z.string().trim().nullable()
  })
  .superRefine((value, context) => {
    if (!value.title && !value.description?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Enter an enquiry message or title.",
        path: ["description"]
      });
    }
    const mobileDigits = value.capturedPhone?.replace(/\D/g, "") ?? "";
    if (value.capturedPhone && (mobileDigits.length < 7 || mobileDigits.length > 15)) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid mobile number.",
        path: ["capturedPhone"]
      });
    }
    if (!value.contactId && !value.capturedName?.trim() && !value.capturedPhone?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Customer name or mobile number is required.",
        path: ["capturedName"]
      });
    }
  });
