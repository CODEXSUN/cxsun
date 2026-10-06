export type EnquiryStatus = "new" | "contacted" | "qualified" | "unqualified";
export type EnquiryPriority = "low" | "normal" | "high";

export type EnquirySavePayload = {
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

export type EnquiryRecord = EnquirySavePayload & {
  id: number;
  enquiryNo: number;
  uuid: string;
  contactName: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnquiryLookup = {
  id: number;
  name: string;
  status: string;
  primaryPhone?: string | null;
  phones?: Array<{ phone: string }>;
};
