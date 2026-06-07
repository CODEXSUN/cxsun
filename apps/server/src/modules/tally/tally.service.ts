import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { TallyRepository } from './tally.repository.js'
import type { TallySettingsInput, TallySyncJobInput } from './tally.types.js'

@Injectable()
export class TallyService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(TallyRepository) private readonly tally: TallyRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async workspace(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tally.workspace(context)
  }

  async saveSettings(headers: TenantRequestHeaders, input: TallySettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const settings = await this.tally.saveSettings(context, input ?? {})
    return { ok: true, settings, workspace: await this.tally.workspace(context) }
  }

  async createJob(headers: TenantRequestHeaders, input: TallySyncJobInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const workspace = await this.tally.createJob(context, input ?? {})
    await this.queue.enqueue({ type: 'tally.sync.requested', payload: { tenantId: context.tenant.id, requestedBy: context.user.email, jobType: input?.job_type ?? 'manual-sync' } })
    return { ok: true, workspace }
  }
}
