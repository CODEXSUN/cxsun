export type HttpExceptionDetails = Record<string, unknown>

export class HttpException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details: HttpExceptionDetails = {},
  ) {
    super(message)
    this.name = 'HttpException'
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request', details: HttpExceptionDetails = {}) {
    super(400, message, details)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized', details: HttpExceptionDetails = {}) {
    super(401, message, details)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden', details: HttpExceptionDetails = {}) {
    super(403, message, details)
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found', details: HttpExceptionDetails = {}) {
    super(404, message, details)
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message = 'Internal Server Error', details: HttpExceptionDetails = {}) {
    super(500, message, details)
  }
}
