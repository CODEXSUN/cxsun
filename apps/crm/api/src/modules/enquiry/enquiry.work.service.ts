import { AppError } from "@cxsun/framework/errors";
import { EnquiryService } from "./enquiry.service.js";
import { EnquiryWorkRepository } from "./enquiry.work.repository.js";
import type { EnquiryRelations } from "./enquiry.service.js";
import type { EnquiryEstimateInput, EnquiryJobInput } from "./enquiry.types.js";

export class EnquiryWorkService {
  constructor(
    private readonly enquiries: EnquiryService,
    private readonly work: EnquiryWorkRepository,
    private readonly relations: EnquiryRelations
  ) {}

  async listJobs(enquiryId: number) {
    await this.requireEnquiry(enquiryId);
    return this.work.listJobs(enquiryId);
  }

  async startJob(enquiryId: number, actor: string) {
    await this.requireEnquiry(enquiryId);
    return this.work.startJob(enquiryId, actor, actor);
  }

  async stopJob(enquiryId: number, jobId: number, actor: string) {
    await this.requireEnquiry(enquiryId);
    return this.work.stopJob(enquiryId, jobId, actor);
  }

  async saveJob(enquiryId: number, input: EnquiryJobInput, actor: string, jobId?: number) {
    await this.requireEnquiry(enquiryId);
    const employee = await this.relations.user(input.employeeUserId);
    if (!employee) throw AppError.validation("Select an active employee.");
    if (input.status === "running" && input.stopAt) {
      throw AppError.validation("A running job cannot have a stop time.");
    }
    if (input.status !== "running" && !input.stopAt) {
      throw AppError.validation("Enter a stop time for a completed or cancelled job.");
    }
    if (input.stopAt && Date.parse(input.stopAt) < Date.parse(input.startAt)) {
      throw AppError.validation("Stop time must be after start time.");
    }
    return this.work.saveJob(enquiryId, input, employee.name, actor, jobId);
  }

  async listEstimates(enquiryId: number) {
    await this.requireEnquiry(enquiryId);
    return this.work.listEstimates(enquiryId);
  }

  async saveEstimate(
    enquiryId: number,
    input: EnquiryEstimateInput,
    actor: string,
    estimateId?: number
  ) {
    await this.requireEnquiry(enquiryId);
    const supplier = await this.relations.contact(input.supplierContactId);
    if (!supplier) throw AppError.validation("Select an active Core contact as vendor.");
    return this.work.saveEstimate(enquiryId, input, supplier.name, actor, estimateId);
  }

  async listActivity(enquiryId: number) {
    await this.requireEnquiry(enquiryId);
    return this.work.listActivity(enquiryId);
  }

  private async requireEnquiry(id: number) {
    if (!(await this.enquiries.get(id))) throw AppError.notFound("Enquiry was not found.");
  }
}
