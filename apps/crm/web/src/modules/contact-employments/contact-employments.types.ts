export type ContactEmploymentsInput = {
  personId: number;
  jobTitle: string | null;
  department: string | null;
  seniority: string | null;
  workLocation: string | null;
  employmentStatus: string | null;
  joiningDate: string | null;
  endDate: string | null;
};

export type ContactEmploymentsRecord = ContactEmploymentsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
