import { z } from "zod";

export const questionSchema = z
  .string()
  .trim()
  .min(3, "Describe the issue in at least three characters.")
  .max(2000);
