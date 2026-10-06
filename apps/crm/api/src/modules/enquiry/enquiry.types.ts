import type { ColumnType, Generated } from "kysely";

export type EnquiryStatus = "new" | "contacted" | "qualified" | "unqualified";
export type EnquiryPriority = "low" | "normal" | "high";

export type EnquiryInput = {
  title: string;
  description: string | null;
  contactId: number | null;
  capturedName: string | null;
  capturedEmail: string | null;
  capturedPhone: string | null;
  source: string;
  sourceReference: string | null;
  listIn: string | null;
  status: EnquiryStatus;
  priority: EnquiryPriority;
  assignedUserId: number | null;
  enquiredAt: string;
  dueDate: string | null;
  closedReason: string | null;
};

export type EnquiryRecord = EnquiryInput & {
  id: number;
  enquiryNo: number;
  uuid: string;
  contactName: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnquiryRow = {
  id: Generated<number>;
  enquiry_no: number;
  uuid: Generated<string>;
  title: string;
  description: string | null;
  contact_id: number | null;
  captured_name: string | null;
  captured_email: string | null;
  captured_phone: string | null;
  source: string;
  source_reference: string | null;
  list_in: string | null;
  status: EnquiryStatus;
  priority: EnquiryPriority;
  assigned_user_id: number | null;
  enquired_at: string;
  due_date: string | null;
  closed_reason: string | null;
  created_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};

export type EnquiryDatabase = {
  crm_enquiries: EnquiryRow;
  crm_enquiry_number_sequence: { id: number; next_no: number };
};
