export type EnquirySavePayload = {
  title: string;
  description: string | null;
  contactId: number | null;
  capturedName: string | null;
  capturedEmail: string | null;
  capturedPhone: string | null;
  source: string;
  sourceReference: string | null;
  listInId: number | null;
  statusId: number;
  priorityId: number;
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
  listIn: string | null;
  status: string;
  statusName: string;
  priority: string;
  priorityName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnquiryPage = {
  items: EnquiryRecord[];
  total: number;
  statusCounts: Array<{ code: string; count: number }>;
};
export type EnquiryReportFilters = {
  fromDate?: string | undefined;
  toDate?: string | undefined;
  listInId?: string | undefined;
  createdBy?: string | undefined;
  assignedUserId?: string | undefined;
  filter?: string | undefined;
};
export type EnquiryReportRow = {
  listInId: number | null;
  listIn: string | null;
  createdBy: string;
  assignedUserId: number | null;
  status: string;
  statusName: string;
  count: number;
};
export type EnquiryAttention = {
  assignments: Array<{
    id: number;
    enquiryId: number;
    enquiryNo: number;
    title: string;
    createdAt: string;
  }>;
  due: EnquiryRecord[];
};
export type EnquiryScopeSummary = {
  total: number;
  active: number;
  newCalls: number;
  attention: number;
  updated7: number;
  updated30: number;
  created7: number;
  created30: number;
  oldestActiveDays: number | null;
  statusCounts: Array<{ code: string; count: number }>;
  priorityCounts: Array<{ code: string; count: number }>;
};
export type EnquirySummary = {
  allCount: number;
  assigned: EnquiryScopeSummary;
  created: EnquiryScopeSummary;
};

export type EnquiryLookup = {
  id: number;
  name: string;
  email?: string;
  status: string;
  primaryPhone?: string | null;
  phones?: Array<{ phone: string }>;
};

export type EnquiryMasterLookup = {
  id: number;
  name: string;
  status: "active" | "inactive";
  code?: string;
};

export type EnquiryComment = {
  id: number;
  uuid: string;
  enquiryId: number;
  parentId: number | null;
  body: string;
  bodyFormat: "plain" | "html";
  createdBy: string;
  createdAt: string;
};

export type EnquiryJobStatus = "running" | "completed" | "cancelled";
export type EnquiryJobSavePayload = {
  employeeUserId: number;
  startAt: string;
  stopAt: string | null;
  ratePerHour: number;
  status: EnquiryJobStatus;
};
export type EnquiryJob = Omit<EnquiryJobSavePayload, "employeeUserId"> & {
  id: number;
  uuid: string;
  enquiryId: number;
  employeeUserId: number | null;
  employee: string;
  durationSeconds: number;
  totalCost: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnquiryEstimateSavePayload = {
  date: string;
  itemName: string;
  supplierContactId: number;
  price: number;
};
export type EnquiryEstimate = EnquiryEstimateSavePayload & {
  id: number;
  uuid: string;
  enquiryId: number;
  supplierName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnquiryActivity = {
  id: number;
  uuid: string;
  enquiryId: number;
  action: string;
  details: string;
  createdBy: string;
  createdAt: string;
};

export type EnquiryPropertyPatch = Partial<
  Pick<
    EnquirySavePayload,
    "listInId" | "priorityId" | "assignedUserId" | "dueDate" | "statusId" | "closedReason"
  >
>;
