export interface MasterRecord {
  id: number
  uuid: string
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  [key: string]: unknown
}

export class MasterRecordEntity {
  private constructor(private readonly record: MasterRecord) {}

  static fromRecord(record: MasterRecord) {
    return new MasterRecordEntity(record)
  }

  get id() {
    return this.record.id
  }

  get uuid() {
    return this.record.uuid
  }

  toJSON() {
    return this.record
  }
}

