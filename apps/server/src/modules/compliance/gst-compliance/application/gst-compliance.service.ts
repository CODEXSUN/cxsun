import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { gstComplianceOperations, type GstComplianceOperation, type GstComplianceOperationInput, type GstProviderSettingsInput } from '../domain/gst-compliance.types.js'
import { GstComplianceRepository } from '../infrastructure/gst-compliance.repository.js'
import { callMasterGst, masterGstOperationDefinition, redactedMasterGstHeaders } from '../infrastructure/mastergst.client.js'

@Injectable()
export class GstComplianceService {
  constructor(
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(GstComplianceRepository) private readonly compliance: GstComplianceRepository,
  ) {}

  async getSettings(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.getSettings(context, query.companyId)
  }

  async saveSettings(headers: TenantRequestHeaders, input: GstProviderSettingsInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.saveSettings(context, input)
  }

  async listOperations(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.listOperations(context, query)
  }

  async listDocuments(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.listDocuments(context, query)
  }

  async runOperation(headers: TenantRequestHeaders, operationInput: string, input: GstComplianceOperationInput) {
    const operation = parseOperation(operationInput)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const settings = await this.compliance.getEnabledSettings(context, input.companyId)
    const definition = masterGstOperationDefinition(operation)
    const source = this.compliance.normalizeSource(input)
    let providerResponse: unknown = null
    let httpStatus: number | null = null
    let providerStatus: string | null = null
    let success = false
    let errorMessage: string | null = null
    let authToken = ''

    try {
      if (definition.needsAuth) {
        const token = await this.authToken(headers, settings.companyId, Boolean(input.forceRefreshToken))
        authToken = token.authToken
      }

      const response = await callMasterGst(settings, {
        endpoint: definition.endpoint,
        method: definition.method,
        payload: input.payload,
        query: input.query,
        token: definition.needsAuth ? authToken : undefined,
      })
      providerResponse = response.response
      httpStatus = response.httpStatus
      providerStatus = providerStatusFromResponse(providerResponse)
      success = response.ok && !providerErrorMessage(providerResponse)
      errorMessage = providerErrorMessage(providerResponse)
      if (operation === 'authenticate' && success) {
        const token = await this.compliance.saveToken(context, settings, providerResponse)
        success = Boolean(token.authToken)
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'GST compliance operation failed.'
      providerResponse = { error: errorMessage }
    }

    const operationRecord = await this.compliance.recordOperation(context, {
      endpoint: definition.endpoint,
      errorMessage,
      httpStatus,
      method: definition.method,
      operation,
      providerResponse,
      providerStatus,
      requestJson: {
        headers: redactedMasterGstHeaders(settings, definition.needsAuth ? authToken : undefined),
        payload: input.payload ?? null,
        query: { ...(input.query ?? {}), email: settings.email },
      },
      settings,
      source,
      success,
    })
    const document = success ? await this.compliance.upsertDocumentFromOperation(context, settings, source, operationRecord, providerResponse) : null
    return { ok: success, document, error: errorMessage, operation: operationRecord, response: providerResponse }
  }

  private async authToken(headers: TenantRequestHeaders, companyId: string, forceRefresh: boolean) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const settings = await this.compliance.getEnabledSettings(context, companyId)
    if (!forceRefresh) {
      const cached = await this.compliance.getCachedToken(context, settings.id)
      if (cached) return cached
    }
    const definition = masterGstOperationDefinition('authenticate')
    const response = await callMasterGst(settings, { endpoint: definition.endpoint, method: definition.method })
    const token = await this.compliance.saveToken(context, settings, response.response)
    await this.compliance.recordOperation(context, {
      endpoint: definition.endpoint,
      httpStatus: response.httpStatus,
      method: definition.method,
      operation: 'authenticate',
      providerResponse: response.response,
      providerStatus: providerStatusFromResponse(response.response),
      requestJson: { headers: redactedMasterGstHeaders(settings), query: { email: settings.email } },
      settings,
      source: { documentDate: null, documentNo: null, sourceId: null, sourceType: null, sourceUuid: null },
      success: response.ok && Boolean(token.authToken),
    })
    return token
  }
}

function parseOperation(value: string): GstComplianceOperation {
  if (gstComplianceOperations.includes(value as GstComplianceOperation)) return value as GstComplianceOperation
  throw new BadRequestException('Unsupported GST compliance operation.')
}

function providerStatusFromResponse(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return stringOrNull(record.status_cd) ?? stringOrNull(record.status) ?? stringOrNull(record.Status) ?? stringOrNull(record.statusCode)
}

function providerErrorMessage(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const status = stringOrNull(record.status_cd)?.toLowerCase()
  if (status && !['1', 'success', 'sucess', 'succeeded'].includes(status)) {
    return stringOrNull(record.status_desc) ?? stringOrNull(record.error) ?? stringOrNull(record.message) ?? 'Provider returned an error.'
  }
  return stringOrNull(record.error) ?? null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
