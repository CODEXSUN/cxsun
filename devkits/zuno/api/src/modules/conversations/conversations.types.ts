import type { ColumnType, Generated } from "kysely";

export const workModes = ["ask", "investigate", "plan", "build", "review", "operate"] as const;
export type WorkMode = (typeof workModes)[number];
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string | undefined>;

export type ZunoThreadTable = {
  id: Generated<number>;
  uuid: string;
  title: string;
  mode: WorkMode;
  status: "active" | "busy" | "archived";
  created_by: string;
  updated_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ZunoMessageTable = {
  id: Generated<number>;
  uuid: string;
  thread_uuid: string;
  role: "user" | "assistant";
  status: "complete" | "error";
  content: string;
  evidence_json: string;
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ZunoThread = {
  uuid: string;
  title: string;
  mode: WorkMode;
  status: "active" | "busy" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ZunoMessage = {
  uuid: string;
  role: "user" | "assistant";
  status: "complete" | "error";
  content: string;
  evidence: Array<{ source: string; content: string }>;
  createdAt: string;
};
