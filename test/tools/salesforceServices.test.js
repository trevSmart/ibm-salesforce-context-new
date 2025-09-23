import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const HTTPS_ENDPOINT = 'https://test.salesforce.com';
const HTTP_ENDPOINT = 'http://test.salesforce.com';

async function importModules() {
	const configModule = await import('../../src/config.js');
	const networkUtilsModule = await import('../../src/lib/networkUtils.js');
	return {config: configModule.default, applyFetchSslOptions: networkUtilsModule.applyFetchSslOptions};
}

describe('Salesforce Services SSL Configuration', () => {
	const originalEnv = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

	beforeEach(() => {
		vi.resetModules();
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalEnv;
	});

	afterEach(() => {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalEnv;
	});

	it('exposes strictSsl configuration parameter', async () => {
		const {config} = await importModules();
		expect(typeof config.strictSsl).toBe('boolean');
	});

	it('does not relax TLS when strictSsl is true', async () => {
		const {config, applyFetchSslOptions} = await importModules();
		config.strictSsl = true;

		applyFetchSslOptions(HTTPS_ENDPOINT, {});

		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe(originalEnv);
	});

	it('relaxes TLS when strictSsl is false', async () => {
		const {config, applyFetchSslOptions} = await importModules();
		config.strictSsl = false;

		applyFetchSslOptions(HTTPS_ENDPOINT, {});

		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
	});

	it('does not change TLS setting for non-HTTPS endpoints', async () => {
		const {config, applyFetchSslOptions} = await importModules();
		config.strictSsl = false;

		applyFetchSslOptions(HTTP_ENDPOINT, {});

		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe(originalEnv);
	});
});
