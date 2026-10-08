import { z } from "zod";

export const messageSchema = z
  .string()
  .trim()
  .min(1, "Write a message first.")
  .max(20_000, "Message is too long.");
