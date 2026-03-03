import { HttpStatus } from '@nestjs/common';

export interface AppResponse<T = unknown> {
  statusCode: number;
  message: string;
  error: unknown | null;
  data: T | null;
}

export const successResponse = <T>(
  message: string,
  data: T,
  statusCode: HttpStatus = HttpStatus.OK,
): AppResponse<T> => ({
  statusCode,
  message,
  error: null,
  data,
});

export const errorResponse = (
  message: string,
  error: unknown,
  statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
): AppResponse<null> => ({
  statusCode,
  message,
  error,
  data: null,
});
