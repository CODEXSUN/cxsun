export type ContactRolesInput = {
  personId: number;
  roleName: string;
  isPrimaryRole: boolean;
  decisionAuthority: string | null;
  influenceLevel: string | null;
};

export type ContactRolesRecord = ContactRolesInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
