export type StatusRecord = {
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
export type StatusInput = { name: string; sortOrder: number };
