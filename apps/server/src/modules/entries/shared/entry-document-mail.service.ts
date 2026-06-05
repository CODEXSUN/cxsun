import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../core/exceptions/http.exception.js'
import type { TenantRuntimeContext } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { MailRepository } from '../../mail/mail.repository.js'

type EntryKind = 'payment' | 'purchase' | 'receipt' | 'sales'
type EntryRecord = Record<string, unknown>

@Injectable()
export class EntryDocumentMailService {
  constructor(
    @Inject(MailRepository) private readonly mail: MailRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async queueEntryEmail(context: TenantRuntimeContext, kind: EntryKind, entry: EntryRecord, recipient: string) {
    const email = recipient.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('A valid recipient email is required.')

    const settings = await this.mail.settings(context)
    if (!settings.enabled) throw new BadRequestException('Mail settings are not enabled for this tenant.')

    const details = entryDetails(kind, entry)
    const pdf = await createEntryPdf(details, entry)
    const message = await this.mail.createOutbound(context, {
      attachments: [{
        base64: Buffer.from(pdf).toString('base64'),
        fileName: `${safeFileName(details.documentNo)}.pdf`,
        mimeType: 'application/pdf',
      }],
      bcc: [],
      bodyHtml: entryMailHtml(details),
      bodyText: entryMailText(details),
      cc: [],
      fromEmail: settings.from_email || context.user.email,
      fromName: settings.from_name,
      replyTo: settings.reply_to,
      status: 'queued',
      subject: `${details.title} ${details.documentNo}`,
      to: [email],
    })

    await this.queue.enqueue({
      type: 'mail.send',
      payload: {
        tenantSlug: context.tenant.slug,
        tenantId: context.tenant.id,
        messageUuid: message.uuid,
        requestedBy: context.user.email,
      },
    })

    return { message, recipient: email }
  }
}

function entryDetails(kind: EntryKind, entry: EntryRecord) {
  const definitions = {
    payment: { date: 'payment_date', document: 'payment_no', party: 'party_name', title: 'Payment Voucher' },
    purchase: { date: 'entry_date', document: 'entry_no', party: 'supplier_name', title: 'Purchase Entry' },
    receipt: { date: 'receipt_date', document: 'receipt_no', party: 'party_name', title: 'Receipt Voucher' },
    sales: { date: 'invoice_date', document: 'invoice_no', party: 'customer_name', title: 'Tax Invoice' },
  } as const
  const definition = definitions[kind]
  return {
    amount: moneyValue(entry.grand_total ?? entry.net_amount),
    date: textValue(entry[definition.date]),
    documentNo: textValue(entry[definition.document]) || 'Document',
    kind,
    party: textValue(entry[definition.party]) || 'Customer',
    title: definition.title,
  }
}

async function createEntryPdf(details: ReturnType<typeof entryDetails>, entry: EntryRecord) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const state = { document, page: document.addPage([595.28, 841.89]), y: 790 }

  drawText(state.page, details.title, 40, state.y, 18, bold)
  state.y -= 32
  drawKeyValue(state.page, 'Document No', details.documentNo, 40, state.y, regular, bold)
  drawKeyValue(state.page, 'Date', details.date || '-', 315, state.y, regular, bold)
  state.y -= 22
  drawKeyValue(state.page, 'Party', details.party, 40, state.y, regular, bold)
  state.y -= 22
  drawKeyValue(state.page, 'Total', `INR ${formatMoney(details.amount)}`, 40, state.y, regular, bold)
  state.y -= 32
  drawRule(state.page, state.y)
  state.y -= 24

  const items = Array.isArray(entry.items) ? entry.items as EntryRecord[] : Array.isArray(entry.allocations) ? entry.allocations as EntryRecord[] : []
  if (items.length) {
    drawText(state.page, 'Details', 40, state.y, 12, bold)
    state.y -= 22
    for (const [index, item] of items.entries()) {
      if (state.y < 75) {
        state.page = document.addPage([595.28, 841.89])
        state.y = 790
      }
      const name = textValue(item.product_name ?? item.reference_no ?? item.document_no ?? item.description) || `Line ${index + 1}`
      const quantity = textValue(item.quantity)
      const amount = moneyValue(item.line_total ?? item.allocated_amount ?? item.amount)
      drawText(state.page, `${index + 1}. ${truncate(name, 68)}`, 40, state.y, 9, regular)
      drawText(state.page, quantity ? `Qty ${quantity}` : '', 370, state.y, 9, regular)
      drawText(state.page, amount ? `INR ${formatMoney(amount)}` : '', 455, state.y, 9, regular)
      state.y -= 18
    }
    state.y -= 8
    drawRule(state.page, state.y)
  }

  drawText(state.page, `Generated from CXSun for ${details.party}`, 40, 42, 8, regular, rgb(0.4, 0.4, 0.4))
  return document.save()
}

function drawKeyValue(page: PDFPage, label: string, value: string, x: number, y: number, regular: PDFFont, bold: PDFFont) {
  drawText(page, `${label}:`, x, y, 9, bold)
  drawText(page, truncate(value, 42), x + 70, y, 9, regular)
}

function drawRule(page: PDFPage, y: number) {
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.7, color: rgb(0.75, 0.75, 0.75) })
}

function drawText(page: PDFPage, value: string, x: number, y: number, size: number, font: PDFFont, color = rgb(0.08, 0.08, 0.08)) {
  if (!value) return
  page.drawText(value, { x, y, size, font, color })
}

function entryMailHtml(details: ReturnType<typeof entryDetails>) {
  return `<div style="background:#f6f8fb;padding:28px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e4e8ef;border-radius:8px;overflow:hidden">
    <div style="background:#059669;color:#fff;padding:20px 24px"><div style="font-size:13px;opacity:.9">CXSun Billing</div><div style="font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(details.title)}</div></div>
    <div style="padding:24px"><p style="margin-top:0">Hello,</p><p>Please find the attached ${escapeHtml(details.title.toLowerCase())}.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        ${htmlRow('Document', details.documentNo)}${htmlRow('Date', details.date || '-')}${htmlRow('Party', details.party)}${htmlRow('Total', `INR ${formatMoney(details.amount)}`)}
      </table>
      <p style="font-size:13px;color:#667085;margin-bottom:0">This email was queued from the CXSun entry desk. The PDF attachment is the document copy for your records.</p>
    </div>
  </div>
</div>`
}

function entryMailText(details: ReturnType<typeof entryDetails>) {
  return `${details.title} ${details.documentNo}\nDate: ${details.date || '-'}\nParty: ${details.party}\nTotal: INR ${formatMoney(details.amount)}\n\nThe PDF document is attached.`
}

function htmlRow(label: string, value: string) {
  return `<tr><td style="padding:9px;border-bottom:1px solid #edf0f4;color:#667085">${escapeHtml(label)}</td><td style="padding:9px;border-bottom:1px solid #edf0f4;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

function safeFileName(value: string) {
  return value.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document'
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value
}

function textValue(value: unknown) {
  return String(value ?? '').trim()
}

function moneyValue(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)
}
