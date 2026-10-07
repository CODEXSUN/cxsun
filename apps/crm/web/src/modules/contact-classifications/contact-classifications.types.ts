export type ContactClassificationsInput = {
  personId: number;
  category: string | null;
  priorityLevel: string | null;
  isVip: boolean;
  isPrimaryContact: boolean;
};

export type ContactClassificationsRecord = ContactClassificationsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
