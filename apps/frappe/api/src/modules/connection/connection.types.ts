import type { EnquiryDatabase } from "@cxsun/crm-api/enquiry-sync";
import type { ColumnType } from "kysely";

export type FrappeSettings = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
};

export type FrappeSyncRow = {
  enquiry_id: number;
  remote_name: string;
  synced_at: ColumnType<string, string | undefined, string>;
};

export type FrappeDatabase = EnquiryDatabase & {
  frappe_enquiry_sync: FrappeSyncRow;
};
