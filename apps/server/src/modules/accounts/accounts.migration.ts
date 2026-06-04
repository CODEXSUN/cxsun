import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateAccountsTables(database: Kysely<DynamicDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS account_ledgers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      path VARCHAR(240) NOT NULL,
      account_type VARCHAR(40) NOT NULL,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(180) NOT NULL,
      opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
      current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'active',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_account_ledgers_tenant_path (tenant_id, path),
      INDEX idx_account_ledgers_type (tenant_id, account_type, is_active)
    )
  `.execute(database)

  await createBookTable(database, 'cash_books', 'uq_cash_books_context_no', 'idx_cash_books_ledger_date', 'idx_cash_books_date')
  await createBookTable(database, 'bank_books', 'uq_bank_books_context_no', 'idx_bank_books_ledger_date', 'idx_bank_books_date')
  await ensureBookColumns(database, 'cash_books')
  await ensureBookColumns(database, 'bank_books')
  await sql`
    CREATE TABLE IF NOT EXISTS account_book_comments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      book_type VARCHAR(20) NOT NULL,
      entry_id BIGINT UNSIGNED NOT NULL,
      author_email VARCHAR(180) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_book_comments_entry (tenant_id, book_type, entry_id, id)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_book_activities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      book_type VARCHAR(20) NOT NULL,
      entry_id BIGINT UNSIGNED NOT NULL,
      activity_type VARCHAR(40) NOT NULL,
      actor_email VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      payload TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_book_activities_entry (tenant_id, book_type, entry_id, id)
    )
  `.execute(database)

  const tables = await database.introspection.getTables()
  if (tables.some((table) => table.name === 'account_ledger_entries')) {
    await sql`
      INSERT IGNORE INTO cash_books (
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
      direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      )
      SELECT
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
        direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      FROM account_ledger_entries
      WHERE book_type = 'cash'
    `.execute(database)

    await sql`
      INSERT IGNORE INTO bank_books (
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
        direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      )
      SELECT
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
        direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      FROM account_ledger_entries
      WHERE book_type = 'bank'
    `.execute(database)
  }
}

async function createBookTable(
  database: Kysely<DynamicDatabase>,
  tableName: string,
  uniqueKeyName: string,
  ledgerIndexName: string,
  dateIndexName: string,
) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      ledger_id BIGINT UNSIGNED NOT NULL,
      voucher_no VARCHAR(80) NOT NULL,
      voucher_date DATE NOT NULL,
      direction VARCHAR(20) NOT NULL,
      party_id VARCHAR(80) NULL,
      party_name VARCHAR(220) NULL,
      particulars VARCHAR(220) NULL,
      narration TEXT NULL,
      reference_no VARCHAR(120) NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      balance_after DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      notes TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY ${uniqueKeyName} (tenant_id, company_id, accounting_year_id, voucher_no),
      INDEX ${ledgerIndexName} (ledger_id, voucher_date, id),
      INDEX ${dateIndexName} (tenant_id, voucher_date, id)
    )
  `).execute(database)
}

async function ensureBookColumns(database: Kysely<DynamicDatabase>, tableName: string) {
  await addColumnIfMissing(database, tableName, 'party_id', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, tableName, 'particulars', 'VARCHAR(220) NULL')
}

async function addColumnIfMissing(database: Kysely<DynamicDatabase>, tableName: string, columnName: string, definition: string) {
  const columns = await database.introspection.getTables()
  const table = columns.find((item) => item.name === tableName)
  if (table?.columns.some((column) => column.name === columnName)) return
  await sql.raw(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).execute(database)
}
