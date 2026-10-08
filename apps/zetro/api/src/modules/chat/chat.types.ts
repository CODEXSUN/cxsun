import type { ColumnType, Generated } from "kysely";

export type ZetroConversationTable = {
  id: Generated<number>;
  uuid: string;
  owner_email: string;
  title: string;
  created_at: ColumnType<Date | string, never, never>;
  updated_at: ColumnType<Date | string, never, never>;
  deleted_at: Date | string | null;
};

export type ZetroMessageTable = {
  id: Generated<number>;
  uuid: string;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: ColumnType<Date | string, never, never>;
};

export type ZetroDatabase = {
  zetro_conversations: ZetroConversationTable;
  zetro_messages: ZetroMessageTable;
  zetro_capability_grants: {
    id: Generated<number>;
    uuid: string;
    role_key: string;
    capability_key: string;
    status: "active" | "revoked";
    approved_by: string;
    reason: string;
    created_at: ColumnType<Date | string, never, never>;
    updated_at: ColumnType<Date | string, never, never>;
  };
  zetro_policy_events: {
    id: Generated<number>;
    uuid: string;
    role_key: string;
    capability_key: string;
    status: "active" | "revoked";
    decided_by: string;
    reason: string;
    created_at: ColumnType<Date | string, never, never>;
  };
  zetro_tool_events: {
    id: Generated<number>;
    uuid: string;
    conversation_id: number | null;
    actor_email: string;
    capability_key: string;
    decision: "allowed" | "denied" | "failed";
    request_json: string;
    result_json: string | null;
    created_at: ColumnType<Date | string, never, never>;
  };
  zetro_review_notes: {
    id: Generated<number>;
    uuid: string;
    conversation_id: number;
    reviewer_email: string;
    note: string;
    created_at: ColumnType<Date | string, never, never>;
  };
  zetro_approval_requests: {
    id: Generated<number>;
    uuid: string;
    conversation_id: number | null;
    actor_email: string;
    capability_key: string;
    status: "pending" | "approved" | "rejected";
    request_json: string;
    decided_by: string | null;
    decision_note: string | null;
    created_at: ColumnType<Date | string, never, never>;
    decided_at: Date | string | null;
  };
};

export type ZetroProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type ZetroConversation = {
  id: number;
  uuid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ZetroMessage = {
  id: number;
  uuid: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
