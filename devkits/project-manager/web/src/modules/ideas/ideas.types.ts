export type IdeaCategory = "general" | "product" | "engineering" | "design" | "research";
export type IdeaStatus =
  "draft" | "open" | "planning" | "in-progress" | "blocked" | "completed" | "archived";

export type Idea = {
  assignee: string;
  category: IdeaCategory;
  content: string;
  createdAt: string;
  createdBy: string;
  id: number;
  status: IdeaStatus;
  title: string;
  updatedAt: string;
  uuid: string;
};

export type IdeaSavePayload = Pick<Idea, "assignee" | "category" | "content" | "status" | "title">;
