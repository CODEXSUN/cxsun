import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../../infrastructure/database/connection.js'

export interface SiteMessageInput {
  name: string
  email: string
  message: string
}

@Injectable()
export class SiteService {
  async getLandingContent() {
    const database = getDatabase()

    const [pages, services, posts] = await Promise.all([
      database
        .selectFrom('site_pages')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute(),
      database
        .selectFrom('site_services')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute(),
      database
        .selectFrom('site_posts')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute(),
    ])

    return { pages, services, posts }
  }

  async createMessage(input: SiteMessageInput) {
    const database = getDatabase()

    const name = input.name.trim()
    const email = input.email.trim()
    const message = input.message.trim()

    if (!name || !email || !message) {
      return { ok: false, error: 'Name, email, and message are required.' }
    }

    await database
      .insertInto('site_messages')
      .values({ name, email, message })
      .execute()

    return { ok: true }
  }
}
