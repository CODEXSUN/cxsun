export const ideaCategories = ["general", "product", "engineering", "design", "research"] as const;
export const ideaStatuses = [
  "draft",
  "open",
  "planning",
  "in-progress",
  "blocked",
  "completed",
  "archived"
] as const;

export type IdeaCategory = (typeof ideaCategories)[number];
export type IdeaStatus = (typeof ideaStatuses)[number];

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
