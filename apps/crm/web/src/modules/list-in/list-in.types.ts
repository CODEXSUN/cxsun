export type ListInRecord = {
  id: number;
  uuid: string;
  name: string;

  status: "active" | "inactive";
  sortOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ListInInput = { name: string; sortOrder: number };
