import type { Kysely } from "kysely";
import type { FrappeDatabase } from "../connection/index.js";

export type FrappeUser = {
  name: string;
  full_name?: string | null;
  email?: string | null;
  username?: string | null;
  enabled?: number | boolean;
  user_type?: string | null;
  last_active?: string | null;
};

export type FrappeEmployee = {
  name: string;
  user_id?: string | null;
  status?: string | null;
};

export type FrappeUserIdentity = {
  frappeUserId: string;
  name: string;
  email: string;
  employeeCode: string | null;
};

export type FrappeUserSyncContext = {
  database: Kysely<FrappeDatabase>;
  localUsers: () => Promise<{ id: number; email: string; status: string }[]>;
  importUser: (user: { name: string; email: string; password?: string }) => Promise<{
    status: "created" | "already-exists";
    userId: number;
    password: string | null;
  }>;
};
