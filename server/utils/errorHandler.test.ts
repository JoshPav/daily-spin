import { describe, expect, it, vi } from 'vitest';
import { handleError } from './errorHandler';
import { NotFoundError, ValidationError } from './errors';

// Mock the logger
vi.mock('./logger', () => ({
  createTaggedLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock h3 createError
vi.mock('h3', () => ({
  createError: (options: {
    statusCode: number;
    message: string;
    data?: unknown;
  }) => ({
    statusCode: options.statusCode,
    message: options.message,
    data: options.data,
  }),
}));

describe('Error Handler', () => {
  it('should convert AppError to H3 error with correct status code', () => {
    const appError = new NotFoundError('User', { userId: '123' });
    const h3Error = handleError(appError);

    expect(h3Error.statusCode).toBe(404);
    expect(h3Error.message).toBe('User not found');
    expect(h3Error.data).toEqual({ userId: '123' });
  });

  it('should convert ValidationError to H3 error', () => {
    const validationError = new ValidationError('Invalid email', {
      field: 'email',
    });
    const h3Error = handleError(validationError);

    expect(h3Error.statusCode).toBe(400);
    expect(h3Error.message).toBe('Invalid email');
    expect(h3Error.data).toEqual({ field: 'email' });
  });

  it('should merge additional context', () => {
    const appError = new NotFoundError('User', { userId: '123' });
    const h3Error = handleError(appError, { requestId: 'req-456' });

    // Context should be merged in the logger call, but h3Error.data only has error.context
    expect(h3Error.data).toEqual({ userId: '123' });
  });

  it('should handle standard Error objects', () => {
    const error = new Error('Something went wrong');
    const h3Error = handleError(error);

    expect(h3Error.statusCode).toBe(500);
    expect(h3Error.message).toBe('Something went wrong');
  });

  it('should handle unknown error types', () => {
    const error = 'string error';
    const h3Error = handleError(error);

    expect(h3Error.statusCode).toBe(500);
    expect(h3Error.message).toBe('An unexpected error occurred');
  });

  it('should handle null/undefined errors', () => {
    const h3Error = handleError(null);

    expect(h3Error.statusCode).toBe(500);
    expect(h3Error.message).toBe('An unexpected error occurred');
  });
});
