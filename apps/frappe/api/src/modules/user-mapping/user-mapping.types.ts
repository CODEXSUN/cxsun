import type { ColumnType, Kysely } from "kysely";
import type { FrappeDatabase } from "../connection/index.js";

export type FrappeUserMappingRow = {
  local_user_id: number;
  frappe_user_id: string;
  frappe_email: string;
  employee_code: string | null;
  connection_hash: string;
  verified_at: ColumnType<string | Date, string | undefined, string>;
  updated_at: ColumnType<string | Date, string | undefined, string>;
};

export type FrappeUserMappingDatabase = FrappeDatabase & {
  frappe_user_mappings: FrappeUserMappingRow;
};

export type LocalMappingUser = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  status: string;
};

export type FrappeUserMappingContext = {
  database: Kysely<FrappeUserMappingDatabase>;
  localUsers: () => Promise<LocalMappingUser[]>;
  audit: (
    action: "linked" | "updated" | "unlinked",
    user: LocalMappingUser,
    remoteId: string
  ) => Promise<void>;
};
