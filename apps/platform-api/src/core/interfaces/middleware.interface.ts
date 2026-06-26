import type { FastifyRequest, FastifyReply } from 'fastify'

export interface Middleware {
  use(
    request: FastifyRequest,
    reply: FastifyReply,
  ): void | Promise<void>
}
