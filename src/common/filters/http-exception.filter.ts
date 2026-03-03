import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorResponse } from '@/common/utils/response.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, error } = this.handleException(exception);

    this.logger.error(
      `[${request.method}] ${request.url} - ${statusCode}: ${message}`,
      error instanceof Error ? error.stack : String(error),
    );

    response.status(statusCode).json(errorResponse(message, error, statusCode));
  }

  private handleException(exception: unknown) {
    // HttpException (built-in NestJS exceptions)
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (
              exceptionResponse as Record<string, unknown>
            ).message?.toString() || exception.message;

      return { statusCode, message, error: exceptionResponse };
    }

    // Unknown/unhandled errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: exception,
    };
  }
}
