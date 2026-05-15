import { BadRequestException } from '../../../../../core/exceptions/http.exception.js'
import type { MasterDataModuleDefinition } from '../../domain/value-objects/master-data-definition.js'

export function normalizeMasterInput(definition: MasterDataModuleDefinition, input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {}

  for (const column of definition.columns) {
    const value = input[column.key] ?? input[toCamelCase(column.key)]

    if (column.required && (value === null || value === undefined || value === '')) {
      throw new BadRequestException(`${column.label} is required.`)
    }

    if (column.type === 'boolean') {
      payload[column.key] = Boolean(value)
    } else if (column.type === 'number') {
      payload[column.key] = value === null || value === undefined || value === '' ? null : Number(value)
    } else {
      payload[column.key] = typeof value === 'string' ? value.trim() : value ?? null
    }
  }

  payload.is_active = input.is_active ?? input.isActive ?? true
  return payload
}

function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}
