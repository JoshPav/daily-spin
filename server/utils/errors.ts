/**
 * Base application error with context
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly context?: Record<string, unknown>;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      context?: Record<string, unknown>;
      isOperational?: boolean;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.context = options.context;
    this.isOperational = options.isOperational ?? true;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, {
      statusCode: 404,
      context,
      isOperational: true,
    });
  }
}

/**
 * Error thrown when user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', context?: Record<string, unknown>) {
    super(message, {
      statusCode: 401,
      context,
      isOperational: true,
    });
  }
}

/**
 * Error thrown when user lacks permissions
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', context?: Record<string, unknown>) {
    super(message, {
      statusCode: 403,
      context,
      isOperational: true,
    });
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      statusCode: 400,
      context,
      isOperational: true,
    });
  }
}

/**
 * Error thrown when external service call fails (Spotify, etc.)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    operation: string,
    context?: Record<string, unknown>,
  ) {
    super(`${service} service failed: ${operation}`, {
      statusCode: 502,
      context: {
        ...context,
        service,
        operation,
      },
      isOperational: true,
    });
  }
}

/**
 * Error thrown when database operation fails
 */
export class DatabaseError extends AppError {
  constructor(operation: string, context?: Record<string, unknown>) {
    super(`Database operation failed: ${operation}`, {
      statusCode: 500,
      context: {
        ...context,
        operation,
      },
      isOperational: true,
    });
  }
}

/**
 * Error thrown when a conflict occurs (duplicate record, etc.)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, {
      statusCode: 409,
      context,
      isOperational: true,
    });
  }
}
