import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.context).toBeUndefined();
    });

    it('should create error with custom status code and context', () => {
      const context = { userId: '123', operation: 'test' };
      const error = new AppError('Test error', {
        statusCode: 400,
        context,
        isOperational: false,
      });

      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(context);
      expect(error.isOperational).toBe(false);
    });

    it('should have proper stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should include context', () => {
      const context = { userId: '123' };
      const error = new NotFoundError('User', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should create 401 error with custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ValidationError', () => {
    it('should create 400 error', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create 502 error with service details', () => {
      const error = new ExternalServiceError('Spotify', 'fetch user data');

      expect(error.message).toBe('Spotify service failed: fetch user data');
      expect(error.statusCode).toBe(502);
      expect(error.context).toEqual({
        service: 'Spotify',
        operation: 'fetch user data',
      });
    });

    it('should merge additional context', () => {
      const error = new ExternalServiceError('Spotify', 'fetch user data', {
        userId: '123',
        attempts: 3,
      });

      expect(error.context).toEqual({
        service: 'Spotify',
        operation: 'fetch user data',
        userId: '123',
        attempts: 3,
      });
    });
  });

  describe('DatabaseError', () => {
    it('should create 500 error with operation details', () => {
      const error = new DatabaseError('create user');

      expect(error.message).toBe('Database operation failed: create user');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({
        operation: 'create user',
      });
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('User already exists');

      expect(error.message).toBe('User already exists');
      expect(error.statusCode).toBe(409);
    });
  });
});
