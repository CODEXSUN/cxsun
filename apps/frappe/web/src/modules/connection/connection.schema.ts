import { z } from "zod";

export const frappeConnectionSchema = z.object({
  connectionName: z.string().trim().min(1, "Connection name is required.").max(191),
  baseUrl: z.url("Enter a valid Frappe URL.").refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  }, "Enter the Frappe origin without a path or credentials."),
  apiKey: z.string().trim().max(512),
  apiSecret: z.string().trim().max(512),
  enabled: z.boolean()
});
