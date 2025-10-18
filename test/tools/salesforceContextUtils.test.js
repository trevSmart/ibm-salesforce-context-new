import {createMcpClient, disconnectMcpClient} from '../testMcpClient.js';
import { logTestResult, validateMcpToolResponse } from '../testUtils.js';

describe('salesforceContextUtils', () => {
	let client;

	beforeAll(async () => {
		client = await createMcpClient();
	});

	afterAll(async () => {
		await disconnectMcpClient(client);
	});

	test('getOrgAndUserDetails', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getOrgAndUserDetails'
		});

		validateMcpToolResponse(result, 'salesforceContextUtils getOrgAndUserDetails')
		logTestResult('salesforceContextUtils.test.js', 'Get Org And User Details', { action: 'getOrgAndUserDetails' }, 'ok', result)

		expect(result?.structuredContent?.user?.id).toBeTruthyAndDump(result?.structuredContent);
	});

	test('getState', async () => {
		const result = await client.callTool('salesforceContextUtils', {action: 'getState'});

		validateMcpToolResponse(result, 'salesforceContextUtils getState')
		logTestResult('salesforceContextUtils.test.js', 'Get State', { action: 'getState' }, 'ok', result)

		// USE OF CUSTOM MATCHER
		// If not true, write structuredContent to .test-artifacts/
		expect(result?.structuredContent?.state?.org?.user?.id).toBeTruthyAndDump(result?.structuredContent);
	});

	test('loadRecordPrefixesResource', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'loadRecordPrefixesResource'
		});

		validateMcpToolResponse(result, 'salesforceContextUtils loadRecordPrefixesResource')
		logTestResult('salesforceContextUtils.test.js', 'Load Record Prefixes Resource', { action: 'loadRecordPrefixesResource' }, 'ok', result)

		const content = result?.content;
		expect(Array.isArray(content)).toBe(true);

		// expect(content.some(item => item.type === 'resource_link' && item.uri)).toBeTruthy(content); // TODO: REACTIVAR

		const structuredContent = result?.structuredContent;
		expect(structuredContent).toBeTruthy();
		expect(typeof structuredContent).toBe('object');
		expect(Array.isArray(structuredContent)).toBe(false);
		expect(Object.keys(structuredContent).length).toBeGreaterThan(0);
	}, 15_000);

	test('getCurrentDatetime', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getCurrentDatetime'
		});

		validateMcpToolResponse(result, 'salesforceContextUtils getCurrentDatetime')
		logTestResult('salesforceContextUtils.test.js', 'Get Current Datetime', { action: 'getCurrentDatetime' }, 'ok', result)

		expect(result?.structuredContent?.now).toBeTruthy();
		expect(result?.structuredContent?.timezone).toBeTruthy();
	});

	test('clearCache', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'clearCache'
		});

		validateMcpToolResponse(result, 'salesforceContextUtils clearCache')
		logTestResult('salesforceContextUtils.test.js', 'Clear Cache', { action: 'clearCache' }, 'ok', result)

		expect(result?.structuredContent?.status).toBe('success');
		expect(result?.structuredContent?.action).toBe('clearCache');
	});

	test('reportIssue', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'reportIssue',
			issueDescription: 'Test issue for validation',
			issueToolName: 'testTool'
		});

		validateMcpToolResponse(result, 'salesforceContextUtils reportIssue')
		logTestResult('salesforceContextUtils.test.js', 'Report Issue', {
			action: 'reportIssue',
			issueDescription: 'Test issue for validation',
			issueToolName: 'testTool'
		}, 'ok', result)

		expect(result?.structuredContent?.success).toBe(true);
		expect(result.structuredContent.issueId).toBeTruthy();
	});
});
