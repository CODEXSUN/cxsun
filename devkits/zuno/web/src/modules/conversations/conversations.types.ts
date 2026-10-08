export const workModes = ["ask", "investigate", "plan", "build", "review", "operate"] as const;
export type WorkMode = (typeof workModes)[number];
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
export type ZunoConversation = { thread: ZunoThread; messages: ZunoMessage[] };
