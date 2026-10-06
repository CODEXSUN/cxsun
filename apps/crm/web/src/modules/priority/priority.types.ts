export type PriorityRecord = {
  id: number;
  uuid: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  sortOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type PriorityInput = { name: string; sortOrder: number };
