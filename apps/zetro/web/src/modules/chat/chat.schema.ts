import { z } from "zod";

export const zetroPromptSchema = z.string().trim().min(1, "Write a message first.").max(8000);
