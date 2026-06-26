import { chromium } from 'playwright'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../core/exceptions/http.exception.js'

const maximumPrintHtmlBytes = 8 * 1024 * 1024

@Injectable()
export class PrintHtmlPdfService {
  async render(printHtml: unknown) {
    const html = String(printHtml ?? '').trim()
    if (!html) throw new BadRequestException('The printable document is required for email delivery.')
    if (Buffer.byteLength(html, 'utf8') > maximumPrintHtmlBytes) throw new BadRequestException('The printable document is too large.')

    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    }).catch((error) => {
      throw new BadRequestException(`PDF renderer is unavailable: ${error instanceof Error ? error.message : String(error)}`)
    })

    try {
      const page = await browser.newPage({ javaScriptEnabled: false })
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 30_000 })
      await page.emulateMedia({ media: 'print' })
      return await page.pdf({
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
      })
    } finally {
      await browser.close()
    }
  }
}
