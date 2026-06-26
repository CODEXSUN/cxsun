import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { PlatformFoundationRepository } from './platform-foundation.repository.js'
import type { AppInput, AuditEventInput, FileMetadataInput, MailRequestInput, NotificationInput, PolicyInput, ServiceTokenInput, TenantAppsInput, TenantPolicyInput } from './platform-foundation.types.js'

@Injectable()
export class PlatformFoundationService {
  constructor(
    @Inject(PlatformFoundationRepository) private readonly repository: PlatformFoundationRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  listPolicies() { return this.repository.listPolicies() }

  upsertPolicy(input: PolicyInput) {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    const description = input.description?.trim() ?? ''
    if (!code || !name) return { ok: false, error: 'Policy code and name are required.' }
    return this.repository.upsertPolicy({ code, name, description }).then((policy) => ({ ok: true, policy }))
  }

  listTenantPolicies(tenantId: number) { return this.repository.listTenantPolicies(tenantId) }

  upsertTenantPolicy(tenantId: number, input: TenantPolicyInput) {
    const policyCode = normalizeCode(input.policy_code)
    if (!tenantId || !policyCode) return { ok: false, error: 'Tenant and policy are required.' }
    return this.repository.upsertTenantPolicy(tenantId, { policy_code: policyCode, enabled: input.enabled ?? true }).then((policies) => ({ ok: true, policies }))
  }

  async checkPolicy(input: { tenant_id?: number; role?: string; policy_code?: string }) {
    const tenantId = Number(input.tenant_id)
    const role = input.role?.trim() ?? ''
    const policyCode = normalizeCode(input.policy_code)
    const tenant = tenantId ? await this.repository.findTenantById(tenantId) : undefined
    if (!tenant || !role || !policyCode) return { ok: false, allowed: false, error: 'Tenant, role, and policy are required.' }
    return { ok: true, allowed: await this.repository.checkTenantRolePolicy(tenant, role, policyCode) }
  }

  async listCompanies(tenantId: number) {
    const tenant = await this.repository.findTenantById(tenantId)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }
    return { ok: true, companies: await this.repository.listTenantCompanies(tenant) }
  }

  async listAccountingYears(tenantId: number) {
    const tenant = await this.repository.findTenantById(tenantId)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }
    return { ok: true, accountingYears: await this.repository.listTenantAccountingYears(tenant) }
  }

  listApps() { return this.repository.listApps() }

  upsertApp(input: AppInput) {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code || !name) return { ok: false, error: 'App code and name are required.' }
    return this.repository.upsertApp({
      code,
      name,
      category: input.category?.trim() || 'business',
      status: normalizeStatus(input.status),
      metadata: input.metadata ?? {},
    }).then((app) => ({ ok: true, app }))
  }

  tenantApps(tenantId: number) { return this.repository.getTenantApps(tenantId).then((result) => result ? { ok: true, ...result } : { ok: false, error: 'Tenant was not found.' }) }

  updateTenantApps(tenantId: number, input: TenantAppsInput) {
    const enabled = Array.isArray(input.enabled) ? input.enabled.map(normalizeCode).filter(Boolean) : []
    const landing = normalizeCode(input.landing) || enabled[0] || ''
    return this.repository.updateTenantApps(tenantId, { enabled, landing }).then((result) => result ? { ok: true, ...result } : { ok: false, error: 'Tenant was not found.' })
  }

  createServiceToken(input: ServiceTokenInput) {
    const name = input.name?.trim()
    const serviceCode = normalizeCode(input.service_code)
    const scopes = Array.isArray(input.scopes) ? input.scopes.map(normalizeScope).filter(Boolean) : []
    if (!name || !serviceCode || scopes.length === 0) return { ok: false, error: 'Token name, service code, and at least one scope are required.' }
    return this.repository.createServiceToken({ name, service_code: serviceCode, scopes, expires_at: input.expires_at ?? null }).then((serviceToken) => ({ ok: true, serviceToken }))
  }

  listServiceTokens() { return this.repository.listServiceTokens() }

  verifyServiceToken(input: { token?: string }) {
    const token = input.token?.trim()
    if (!token) return { ok: false, valid: false, error: 'Token is required.' }
    return this.repository.verifyServiceToken(token).then((service) => service ? { ok: true, valid: true, service } : { ok: true, valid: false })
  }

  createAuditEvent(input: AuditEventInput) {
    const event = normalizeAudit(input)
    if ('error' in event) return event
    return this.repository.createAuditEvent(event).then((auditEvent) => ({ ok: true, auditEvent }))
  }
  listAuditEvents(limit?: number) { return this.repository.listAuditEvents(normalizeLimit(limit)) }

  createNotification(input: NotificationInput) {
    const subject = input.subject?.trim()
    if (!subject) return { ok: false, error: 'Notification subject is required.' }
    return this.repository.createNotification({
      tenant_id: input.tenant_id ?? null,
      user_id: input.user_id ?? null,
      channel: input.channel?.trim() || 'in-app',
      subject,
      body: input.body?.trim() ?? '',
      payload: input.payload ?? {},
    }).then((notification) => ({ ok: true, notification }))
  }
  listNotifications(limit?: number) { return this.repository.listNotifications(normalizeLimit(limit)) }

  createMailRequest(input: MailRequestInput) {
    const toEmail = input.to_email?.trim().toLowerCase()
    const subject = input.subject?.trim()
    if (!toEmail || !toEmail.includes('@') || !subject) return { ok: false, error: 'Valid email and subject are required.' }
    void this.queue.enqueue({ type: 'platform.mail.requested', payload: { toEmail, subject } })
    return this.repository.createMailRequest({
      tenant_id: input.tenant_id ?? null,
      to_email: toEmail,
      subject,
      body: input.body?.trim() ?? '',
      payload: input.payload ?? {},
    }).then((mailRequest) => ({ ok: true, mailRequest }))
  }
  listMailRequests(limit?: number) { return this.repository.listMailRequests(normalizeLimit(limit)) }

  createFileMetadata(input: FileMetadataInput) {
    const ownerType = normalizeCode(input.owner_type)
    const fileName = input.file_name?.trim()
    const storageKey = input.storage_key?.trim()
    if (!ownerType || !fileName || !storageKey) return { ok: false, error: 'Owner type, file name, and storage key are required.' }
    return this.repository.createFileMetadata({
      tenant_id: input.tenant_id ?? null,
      owner_type: ownerType,
      owner_id: input.owner_id ?? null,
      file_name: fileName,
      mime_type: input.mime_type?.trim() || 'application/octet-stream',
      size_bytes: Number(input.size_bytes ?? 0),
      storage_key: storageKey,
      checksum: input.checksum ?? null,
      metadata: input.metadata ?? {},
    }).then((file) => ({ ok: true, file }))
  }
  listFiles(limit?: number) { return this.repository.listFiles(normalizeLimit(limit)) }

  processQueue(limit?: number) { return this.repository.processQueue(normalizeLimit(limit, 20)) }
}

function normalizeCode(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '')
}
function normalizeScope(value: unknown) { return normalizeCode(value) }
function normalizeStatus(value: unknown) { return ['active', 'inactive', 'suspend'].includes(String(value)) ? String(value) : 'active' }
function normalizeLimit(value: unknown, fallback = 50) {
  const limit = Number(value ?? fallback)
  return Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : fallback
}
function normalizeAudit(input: AuditEventInput): Required<AuditEventInput> | { ok: false; error: string } {
  const actorType = normalizeCode(input.actor_type) || 'platform'
  const eventType = normalizeCode(input.event_type)
  const targetType = normalizeCode(input.target_type)
  if (!eventType || !targetType) return { ok: false, error: 'Audit event type and target type are required.' }
  return {
    actor_type: actorType,
    actor_id: input.actor_id ?? null,
    event_type: eventType,
    target_type: targetType,
    target_id: input.target_id ?? null,
    tenant_id: input.tenant_id ?? null,
    payload: input.payload ?? {},
  }
}
