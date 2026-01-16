import { describe, expect, it } from 'vitest';
import { createTaggedLogger, filterSensitiveData, logger } from './logger';

describe('logger', () => {
  describe('logger instance', () => {
    it('should export a logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });

  describe('createTaggedLogger', () => {
    it('should create a tagged logger', () => {
      const taggedLogger = createTaggedLogger('TestTag');
      expect(taggedLogger).toBeDefined();
      expect(taggedLogger.info).toBeDefined();
    });
  });

  describe('filterSensitiveData', () => {
    it('should filter access tokens', () => {
      const data = {
        userId: '123',
        accessToken: 'secret_token_value',
        albumName: 'Abbey Road',
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.userId).toBe('123');
      expect(filtered.albumName).toBe('Abbey Road');
      expect(filtered.accessToken).toBe('secret_tok...');
    });

    it('should filter refresh tokens', () => {
      const data = {
        refreshToken: 'refresh_token_value',
        userId: '456',
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.userId).toBe('456');
      expect(filtered.refreshToken).toBe('refresh_to...');
    });

    it('should filter various token types', () => {
      const data = {
        access_token: 'access_token_value',
        refresh_token: 'refresh_token_value',
        password: 'password123',
        secret: 'my_secret',
        apiKey: 'api_key_value',
        api_key: 'another_key',
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.access_token).toBe('access_tok...');
      expect(filtered.refresh_token).toBe('refresh_to...');
      expect(filtered.password).toBe('password12...');
      expect(filtered.secret).toBe('***'); // Short sensitive value
      expect(filtered.apiKey).toBe('api_key_va...');
      expect(filtered.api_key).toBe('another_ke...');
    });

    it('should truncate short sensitive values', () => {
      const data = {
        token: 'short',
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.token).toBe('***');
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        userId: '123',
        albumName: 'Dark Side of the Moon',
        trackCount: 10,
        isListened: true,
      };

      const filtered = filterSensitiveData(data);

      expect(filtered).toEqual(data);
    });

    it('should recursively filter nested objects', () => {
      const data = {
        user: {
          id: '123',
          accessToken: 'secret_token',
        },
        album: {
          name: 'Test Album',
        },
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.user).toEqual({
        id: '123',
        accessToken: 'secret_tok...',
      });
      expect(filtered.album).toEqual({
        name: 'Test Album',
      });
    });

    it('should handle arrays without modification', () => {
      const data = {
        tokens: ['token1', 'token2'],
        ids: [1, 2, 3],
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.tokens).toEqual(['token1', 'token2']);
      expect(filtered.ids).toEqual([1, 2, 3]);
    });

    it('should handle null values', () => {
      const data = {
        value: null,
        accessToken: null,
      };

      const filtered = filterSensitiveData(data);

      expect(filtered.value).toBeNull();
      expect(filtered.accessToken).toBeNull();
    });
  });
});
