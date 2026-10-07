import type { ColumnType, Generated } from "kysely";

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
export type ContactEmploymentsRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  job_title: string | null;
  department: string | null;
  seniority: string | null;
  work_location: string | null;
  employment_status: string | null;
  joining_date: string | null;
  end_date: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactEmploymentsDatabase = { contact_employments: ContactEmploymentsRow };
