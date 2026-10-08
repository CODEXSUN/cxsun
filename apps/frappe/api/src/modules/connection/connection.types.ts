import type { EnquiryDatabase } from "@cxsun/crm-api/enquiry-sync";
import type { ColumnType } from "kysely";

export type FrappeSettings = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
};

export type FrappeConnectionInput = {
  connectionName: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
};

export type FrappeConnectionRow = {
  id: number;
  connection_name: string;
  base_url: string;
  api_key_ciphertext: string | null;
  api_secret_ciphertext: string | null;
  enabled: number | boolean;
  verification_status: "unverified" | "verified" | "failed";
  last_checked_at: string | Date | null;
  last_verified_at: string | Date | null;
  updated_at: ColumnType<string | Date, string | undefined, string>;
};

export type FrappeSyncRow = {
  enquiry_id: number;
  remote_name: string;
  synced_at: ColumnType<string, string | undefined, string>;
};

export type FrappeDatabase = EnquiryDatabase & {
  frappe_connection_settings: FrappeConnectionRow;
  frappe_enquiry_sync: FrappeSyncRow;
};
