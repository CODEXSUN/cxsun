import { AppError } from "@cxsun/framework/errors";
import {
  FrappeConnectionRepository,
  requestFrappe,
  type FrappeSettings
} from "../connection/index.js";
import type { EnquiryInput } from "@cxsun/crm-api/enquiry-sync";
import type { EnquirySyncContext, RemoteEnquiry } from "./enquiry-sync.types.js";

const pageSize = 50;
const maxRecords = 1000;
const previewFields = ["name", "title", "mobile", "date", "priority", "status", "modified"];
const detailFields = [
  ...previewFields,
  "enquiry_details",
  "customer",
  "due_date",
  "status_details",
  "user_employee"
];

export class FrappeEnquirySyncService {
  private readonly repository: FrappeConnectionRepository;

  constructor(
    private readonly context: EnquirySyncContext,
    private readonly defaults: FrappeSettings,
    private readonly encryptionSecret: string
  ) {
    this.repository = new FrappeConnectionRepository(context.database);
  }

  async preview() {
    const settings = await this.settings();
    const enquiries: RemoteEnquiry[] = [];
    for (let start = 0; start <= maxRecords; start += pageSize) {
      const query = new URLSearchParams({
        fields: JSON.stringify(previewFields),
        limit_start: String(start),
        limit_page_length: String(pageSize),
        order_by: "modified desc"
      });
      const response = await requestFrappe<{ data?: RemoteEnquiry[] }>(
        `/api/resource/Enquiry?${query}`,
        "GET",
        settings
      );
      if (!Array.isArray(response.data))
        throw AppError.validation("Frappe returned an invalid enquiry list.");
      if (start === maxRecords && response.data.length)
        throw AppError.conflict("Frappe has more than 1,000 enquiries to preview.");
      enquiries.push(...response.data);
      if (response.data.length < pageSize) break;
    }
    const valid = enquiries.filter((item) => typeof item.name === "string" && item.name.trim());
    const links = await this.repository.linksByRemoteNames(valid.map((item) => item.name));
    return valid.map((item) => ({
      name: item.name,
      title: item.title?.trim() || item.name,
      mobile: item.mobile?.trim() || null,
      date: item.date || null,
      status: item.status?.trim() || null,
      priority: item.priority?.trim() || null,
      modifiedAt: item.modified || null,
      localEnquiryId: links.get(item.name) ?? null
    }));
  }

  async pull(remoteName: string) {
    const settings = await this.settings();
    const response = await requestFrappe<{ data?: RemoteEnquiry }>(
      `/api/resource/Enquiry/${encodeURIComponent(remoteName)}?fields=${encodeURIComponent(JSON.stringify(detailFields))}`,
      "GET",
      settings
    );
    const remote = response.data;
    if (!remote || remote.name !== remoteName)
      throw AppError.validation("The selected Frappe enquiry could not be found.");
    const linked = await this.repository.byRemoteName(remoteName);
    if (linked && linked.source !== "frappe")
      throw AppError.conflict("This enquiry originated locally. Post its changes to Frappe.");
    if (linked && utcMillis(linked.updatedAt) > utcMillis(linked.syncedAt))
      throw AppError.conflict(
        "The local enquiry changed after its last sync. Review it before pulling."
      );

    const input = await this.toLocalInput(remote, linked, settings.baseUrl);
    const local = linked
      ? await this.context.updateEnquiry(linked.enquiryId, input)
      : await this.context.createEnquiry(input);
    await this.repository.save(local.id, remote.name);
    return {
      remoteName: remote.name,
      enquiryId: local.id,
      status: linked ? ("updated" as const) : ("created" as const)
    };
  }

  private async toLocalInput(
    remote: RemoteEnquiry,
    linked: Awaited<ReturnType<FrappeConnectionRepository["byRemoteName"]>>,
    baseUrl: string
  ): Promise<EnquiryInput> {
    const phone = remote.mobile?.trim() || null;
    const customer = remote.customer?.trim() || null;
    if (!phone && !customer)
      throw AppError.validation("The Frappe enquiry needs a mobile or customer before import.");
    const date = remote.date?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/u.test(date) || Number.isNaN(Date.parse(date)))
      throw AppError.validation("The Frappe enquiry has an invalid date.");
    const status = await this.context.database
      .selectFrom("crm_enquiry_statuses")
      .select(["id", "code"])
      .where("name", "=", remote.status?.trim() || "New")
      .where("status", "=", "active")
      .executeTakeFirst();
    const priority = await this.context.database
      .selectFrom("crm_enquiry_priorities")
      .select("id")
      .where("name", "=", remote.priority?.trim() || "Normal")
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!status || !priority)
      throw AppError.validation("Match the Frappe status and priority in CRM before import.");
    const dueDate = remote.due_date?.trim() || null;
    if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/u.test(dueDate) || Number.isNaN(Date.parse(dueDate))))
      throw AppError.validation("The Frappe enquiry has an invalid due date.");
    const mappedAssignee = remote.user_employee?.trim()
      ? await this.context.localUserForEmployee(remote.user_employee.trim(), baseUrl)
      : null;
    return {
      title: (remote.title?.trim() || remote.enquiry_details?.trim() || remote.name).slice(0, 255),
      description: remote.enquiry_details?.trim() || null,
      contactId: linked?.contactId ?? null,
      capturedName: customer,
      capturedEmail: null,
      capturedPhone: phone,
      source: "frappe",
      sourceReference: remote.name,
      listInId: linked?.listInId ?? null,
      statusId: status.id,
      priorityId: priority.id,
      assignedUserId: mappedAssignee ?? linked?.assignedUserId ?? null,
      enquiredAt: `${date}T00:00:00.000Z`,
      dueDate,
      closedReason: ["won", "lost", "closed"].includes(status.code)
        ? remote.status_details?.trim() || "Closed in Frappe"
        : null
    };
  }

  private async settings() {
    return (await this.repository.credentials(this.encryptionSecret))?.settings ?? this.defaults;
  }
}

function utcMillis(value: string | Date) {
  if (value instanceof Date) return value.getTime();
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const timestamp = new Date(normalized).getTime();
  if (Number.isNaN(timestamp))
    throw AppError.conflict(
      "The stored enquiry sync time is invalid. Review this link before pulling."
    );
  return timestamp;
}
