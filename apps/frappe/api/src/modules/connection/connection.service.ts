import { AppError } from "@cxsun/framework/errors";
import {
  EnquiryRepository,
  type EnquiryListOptions,
  type EnquiryRecord
} from "@cxsun/crm-api/enquiry-sync";
import type { Kysely } from "kysely";
import type { FrappeDatabase, FrappeSettings } from "./connection.types.js";
import { FrappeConnectionRepository } from "./connection.repository.js";

const maxResponseBytes = 64 * 1024;

export class FrappeConnectionService {
  constructor(
    private readonly database: Kysely<FrappeDatabase>,
    private readonly settings: FrappeSettings,
    private readonly loadEnquiry: (id: number) => Promise<EnquiryRecord>,
    private readonly viewer: Pick<EnquiryListOptions, "actorEmail" | "actorUserId" | "canViewAll">
  ) {}

  configured() {
    return {
      configured: Boolean(this.settings.baseUrl && this.settings.apiKey && this.settings.apiSecret),
      enabled: this.settings.enabled,
      baseUrl: this.settings.baseUrl || null
    };
  }

  async verify() {
    const response = await this.request<{ message?: unknown }>(
      "/api/method/frappe.auth.get_logged_user",
      "GET"
    );
    if (typeof response.message !== "string" || !response.message.trim()) {
      throw upstreamError("Frappe did not identify the authenticated user.");
    }
    return { connected: true, user: response.message.trim() };
  }

  async status(enquiryId: number) {
    await this.loadEnquiry(enquiryId);
    const row = await new FrappeConnectionRepository(this.database).get(enquiryId);
    return {
      enquiryId,
      remoteName: row?.remote_name ?? null,
      syncedAt: row?.synced_at ? new Date(row.synced_at).toISOString() : null
    };
  }

  async overview(page: number, pageSize: number, search: string) {
    const local = await new EnquiryRepository(this.database).listPage({
      ...this.viewer,
      page,
      pageSize,
      search,
      scope: "all",
      filter: "all"
    });
    const sync = await new FrappeConnectionRepository(this.database).overview(
      this.viewer,
      local.items.map((item) => item.id)
    );
    return {
      counts: { total: sync.total, synced: sync.synced, pending: sync.total - sync.synced },
      items: local.items.map((item) => {
        const state = sync.byId.get(item.id);
        return {
          id: item.id,
          enquiryNo: item.enquiryNo,
          title: item.title,
          status: item.statusName,
          updatedAt: item.updatedAt,
          remoteName: state?.remote_name ?? null,
          syncedAt: state?.synced_at ? new Date(state.synced_at).toISOString() : null
        };
      }),
      page,
      pageSize,
      total: local.total
    };
  }

  async sync(enquiryId: number) {
    const enquiry = await this.loadEnquiry(enquiryId);
    const repository = new FrappeConnectionRepository(this.database);
    const existing = await repository.get(enquiryId);
    const payload = this.enquiryPayload(enquiry);
    const remote = existing
      ? await this.request<{ data?: { name?: string } }>(
          `/api/resource/Enquiry/${encodeURIComponent(existing.remote_name)}`,
          "PUT",
          payload
        )
      : await this.request<{ data?: { name?: string } }>("/api/resource/Enquiry", "POST", payload);
    const remoteName = remote.data?.name?.trim() || existing?.remote_name;
    if (!remoteName) throw upstreamError("Frappe did not return an enquiry name.");
    await repository.save(enquiryId, remoteName);
    return { enquiryId, remoteName, syncedAt: new Date().toISOString() };
  }

  private enquiryPayload(enquiry: EnquiryRecord) {
    return {
      title: enquiry.title,
      enquiry_details: enquiry.description || enquiry.title,
      mobile: enquiry.capturedPhone || "",
      date: enquiry.enquiredAt.slice(0, 10),
      due_date: enquiry.dueDate,
      priority: enquiry.priorityName,
      status: enquiry.statusName
    };
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PUT",
    body?: unknown
  ): Promise<T> {
    const { baseUrl, apiKey, apiSecret, enabled } = this.settings;
    if (!enabled) throw AppError.conflict("Frappe sync is disabled.");
    if (!baseUrl || !apiKey || !apiSecret) {
      throw AppError.conflict("Configure the CXSUN Frappe URL, key and secret before syncing.");
    }
    const url = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw AppError.validation(
        "CXSUN_FRAPPE_BASE_URL must be an HTTP or HTTPS origin without credentials or a query."
      );
    }
    let response: Response;
    try {
      response = await fetch(`${url.toString().replace(/\/$/u, "")}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `token ${apiKey}:${apiSecret}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: "error",
        signal: AbortSignal.timeout(15_000)
      });
    } catch {
      throw upstreamError("Frappe could not be reached.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new AppError({
        code: "FRAPPE_AUTH_FAILED",
        message: "Frappe rejected the configured API credentials.",
        statusCode: 502
      });
    }
    if (!response.ok) throw upstreamError(`Frappe returned HTTP ${response.status}.`);
    const data = await readResponse(response);
    try {
      return JSON.parse(data) as T;
    } catch {
      throw upstreamError("Frappe returned invalid JSON.");
    }
  }
}

function upstreamError(message: string) {
  return new AppError({ code: "FRAPPE_SYNC_FAILED", message, statusCode: 502 });
}

async function readResponse(response: Response) {
  if (!response.body) throw upstreamError("Frappe returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > maxResponseBytes) {
      await reader.cancel();
      throw upstreamError("Frappe response is too large.");
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
