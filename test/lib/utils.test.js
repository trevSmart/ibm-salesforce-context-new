import {describe, it, expect} from 'vitest';
import {sanitizeSensitiveData} from '../../src/utils.js';

describe('sanitizeSensitiveData', () => {
	it('should redact accessToken field', () => {
		const data = {
			username: 'test@example.com',
			accessToken: '00D1234567890ABCD!secrettoken12345',
			instanceUrl: 'https://test.salesforce.com'
		};

		const sanitized = sanitizeSensitiveData(data);

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
			client_secret: 'client_secret_456',
			clientSecret: 'another_secret'
		};

		const sanitized = sanitizeSensitiveData(data);

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.accessToken).toContain('[REDACTED');
		expect(sanitized.password).toContain('[REDACTED');
		expect(sanitized.client_secret).toContain('[REDACTED');
		expect(sanitized.clientSecret).toContain('[REDACTED');
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

		expect(sanitized).toEqual(data);
	});

	it('should handle null and undefined values', () => {
		const data = {
			username: 'test@example.com',
			accessToken: null,
			password: undefined
		};

		const sanitized = sanitizeSensitiveData(data);

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

		expect(sanitized.username).toBe('test@example.com');
		expect(sanitized.apiKey).toContain('[REDACTED');
		expect(sanitized.token).toContain('[REDACTED');
	});
});
