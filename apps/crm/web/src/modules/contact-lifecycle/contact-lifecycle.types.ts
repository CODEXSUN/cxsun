export type ContactLifecycleInput = {
  personId: number;
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  effectiveAt: string | null;
};

export type ContactLifecycleRecord = ContactLifecycleInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
