export type FrappeConnection = {
  configured: boolean;
  enabled: boolean;
  baseUrl: string | null;
};

export type FrappeRecord = {
  id: number;
  enquiryNo: number;
  title: string;
  status: string;
  updatedAt: string;
  remoteName: string | null;
  syncedAt: string | null;
};

export type FrappeOverview = {
  counts: { total: number; synced: number; pending: number };
  items: FrappeRecord[];
  page: number;
  pageSize: number;
  total: number;
};
