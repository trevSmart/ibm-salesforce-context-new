import { describe, it, expect } from 'vitest';
import { sanitizeSensitiveData } from '../../src/utils.js';
import { logTestResult } from '../testUtils.js';

describe('sanitizeSensitiveData', () => {
	it('should redact accessToken field', () => {
		const data = {
			username: 'test@example.com',
			accessToken: '00D1234567890ABCD!secrettoken12345',
			instanceUrl: 'https://test.salesforce.com'
		};

		const sanitized = sanitizeSensitiveData(data);

		// Simple logging for unit test
		logTestResult('utils.test.js', 'Redact accessToken field', {
			description: 'Tests that accessToken field is properly redacted while preserving other fields'
		}, 'ok');

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.instanceUrl).toBe('https://test.salesforce.com');
		expect(sanitized.accessToken).toContain('[REDACTED');
		expect(sanitized.accessToken).toContain('length:');
		expect(sanitized.accessToken).not.toContain('secret');
	});

	it('should redact multiple sensitive fields', () => {
		const data = {
			username: 'test@example.com',
			accessToken: 'secret_token_123',
			password: 'my_password',
			// biome-ignore lint/style/useNamingConvention: <Salesforce uses this naming>
			client_secret: 'client_secret_456',
		};

		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Redact multiple sensitive fields', {
			description: 'Tests that multiple sensitive fields are properly redacted'
		}, 'ok');

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.accessToken).toContain('[REDACTED');
		expect(sanitized.password).toContain('[REDACTED');
		expect(sanitized.client_secret).toContain('[REDACTED');
	});

	it('should handle nested objects', () => {
		const data = {
			org: {
				username: 'test@example.com',
				accessToken: 'secret_token',
				details: {
					instanceUrl: 'https://test.salesforce.com',
					password: 'nested_password'
				}
			}
		};

		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Handle nested objects', {
			description: 'Tests that sensitive fields in nested objects are properly redacted'
		}, 'ok');

		expect(sanitized.org.username).toBe('test@example.com');
		expect(sanitized.org.accessToken).toContain('[REDACTED');
		expect(sanitized.org.details.instanceUrl).toBe('https://test.salesforce.com');
		expect(sanitized.org.details.password).toContain('[REDACTED');
	});

	it('should handle arrays', () => {
		const data = {
			items: [
				{name: 'item1', accessToken: 'token1'},
				{name: 'item2', accessToken: 'token2'}
			]
		};

		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Handle arrays', {
			description: 'Tests that sensitive fields in arrays are properly redacted'
		}, 'ok');

		expect(sanitized.items[0].name).toBe('item1');
		expect(sanitized.items[0].accessToken).toContain('[REDACTED');
		expect(sanitized.items[1].name).toBe('item2');
		expect(sanitized.items[1].accessToken).toContain('[REDACTED');
	});

	it('should not modify non-sensitive fields', () => {
		const data = {
			username: 'test@example.com',
			email: 'test@example.com',
			id: '12345',
			name: 'Test User'
		};

		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Not modify non-sensitive fields', {
			description: 'Tests that non-sensitive fields are left unchanged'
		}, 'ok');

		expect(sanitized).toEqual(data);
	});

	it('should handle null and undefined values', () => {
		const data = {
			username: 'test@example.com',
			accessToken: null,
			password: undefined
		};

		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Handle null and undefined', {
			description: 'Tests that null and undefined sensitive fields are properly handled'
		}, 'ok');

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.accessToken).toBe('[REDACTED]');
		expect(sanitized.password).toBe('[REDACTED]');
	});

	it('should handle empty strings', () => {
		const data = {
			username: 'test@example.com',
			accessToken: ''
		};

		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Handle empty strings', {
			description: 'Tests that empty string sensitive fields are properly handled'
		}, 'ok');

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.accessToken).toBe('[REDACTED]');
	});

	it('should not modify the original object', () => {
		const data = {
			username: 'test@example.com',
			accessToken: 'secret_token'
		};

		const original = JSON.parse(JSON.stringify(data));
		const sanitized = sanitizeSensitiveData(data);

		logTestResult('utils.test.js', 'Not modify original object', {
			description: 'Tests that the original object is not modified during sanitization'
		}, 'ok');

		// Original should be unchanged
		expect(data).toEqual(original);
		// Sanitized should be different
		expect(sanitized.accessToken).not.toBe(data.accessToken);
	});

	it('should allow custom fields to redact', () => {
		const data = {
			username: 'test@example.com',
			apiKey: 'my_api_key',
			token: 'my_token'
		};

		const sanitized = sanitizeSensitiveData(data, ['apiKey', 'token']);

		logTestResult('utils.test.js', 'Allow custom fields to redact', {
			description: 'Tests that custom sensitive fields can be specified for redaction'
		}, 'ok');

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.apiKey).toContain('[REDACTED');
		expect(sanitized.token).toContain('[REDACTED');
	});
});
