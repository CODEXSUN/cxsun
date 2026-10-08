import type { ColumnType, Generated } from "kysely";

export type ZetroConversationTable = {
  id: Generated<number>;
  uuid: string;
  owner_email: string;
  title: string;
  created_at: ColumnType<Date | string, never, never>;
  updated_at: ColumnType<Date | string, never, never>;
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
