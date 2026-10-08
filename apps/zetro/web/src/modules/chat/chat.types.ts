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

export type ZetroConversationDetail = {
  conversation: ZetroConversation;
  messages: ZetroMessage[];
};
