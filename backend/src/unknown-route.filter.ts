import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

// An address the backend does not have (for example /v1/nothing) answers
// 404 with a plain sentence instead of the framework's own wording,
// "Cannot GET /v1/nothing" (evaluation 2026-11-12). Every other "not
// found" ("We couldn't find that destination.", ...) keeps its own
// message: only the framework's "Cannot <METHOD> <path>" is replaced.
@Catch(NotFoundException)
export class UnknownRouteFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = exception.getResponse();
    const message = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : body;
    const unknownRoute = typeof message === 'string' && /^Cannot [A-Z]+ \//.test(message);
    response
      .status(404)
      .json(
        unknownRoute
          ? { message: "We couldn't find that address.", error: 'Not Found', statusCode: 404 }
          : body,
      );
  }
}
