import {z} from 'zod';
import client from '../client.js';
import {createModuleLogger} from '../lib/logger.js';
import {executeSoqlQuery, getApexClassCodeCoverage, runApexTest} from '../lib/salesforceServices.js';
import {mcpServer, newResource, resources} from '../mcp-server.js';
import {textFileContent} from '../utils.js';

export const runApexTestToolDefinition = {
	name: 'runApexTest',
	title: 'Run Apex Tests',
	description: await textFileContent('tools/runApexTest.md'),
	inputSchema: {
		classNames: z.array(z.string()).optional().describe('Case sensitive. Names of the Apex test classes to run (all tests in the classes will be run).'),
		methodNames: z.array(z.string()).optional().describe('Test methods to run with the format "testClassName.testMethodName" (only the specified methods will be run).'),
		suiteNames: z.array(z.string()).optional().describe('Case sensitive. Names of the Apex test suites to run (all classes in the suites will be run).'),
		options: z
			.object({
				thenGetApexClassesCodeCoverage: z.array(z.string()).optional().describe('Case sensitive. Names of the Apex classes to get the code coverage for if the test run is successful.')
			})
			.optional()
	},
	annotations: {
		testHint: true,
		destructiveHint: true,
		readOnlyHint: false,
		idempotentHint: true,
		openWorldHint: true,
		title: 'Run Apex Tests'
	}
};

async function classNameElicitation() {
	let testClasses;
	if ('mcp://mcp/apex-test-classes-list.txt' in resources) {
		testClasses = JSON.parse(resources['mcp://mcp/apex-test-classes-list.txt'].text);
	} else {
		const soqlQuery = "SELECT Name, Body, FORMAT(LastModifiedDate), LastModifiedBy.Name FROM ApexClass WHERE NamespacePrefix = NULL AND Status = 'Active' ORDER BY LastModifiedDate DESC";
		const classes = (await executeSoqlQuery(soqlQuery)).records;
		testClasses = classes
			.filter((r) => r.Body.toLowerCase().includes('@istest'))
			.map((r) => ({
				name: r.Name,
				description: `${r.Name} · Last modified on ${r.LastModifiedDate} by ${r.LastModifiedBy.Name}`
			}));
		testClasses = testClasses.sort((a, b) => a.name.localeCompare(b.name));
		newResource('mcp://mcp/apex-test-classes-list.txt', 'Apex test classes list', 'Apex test classes list', 'text/plain', JSON.stringify(testClasses, null, 3), {audience: ['assistant']});
	}

	return await mcpServer.server.elicitInput({
		message: 'Please select the Apex test class to run (all its methods will be executed).',
		requestedSchema: {
			type: 'object',
			title: 'Select the Apex test class to run (all its methods will be executed).',
			properties: {
				confirm: {
					type: 'string',
					enum: testClasses.map((r) => r.name),
					enumNames: testClasses.map((r) => r.description),
					description: 'Select the Apex class to run.'
				}
			},
			required: ['confirm']
		}
	});
}

export async function runApexTestToolHandler({classNames = [], methodNames = [], suiteNames = [], options = {}}) {
	const logger = createModuleLogger(import.meta.url);
	try {
		// Validate that only one input array has items
		const hasClassNames = classNames && classNames.length > 0;
		const hasMethodNames = methodNames && methodNames.length > 0;
		const hasSuiteNames = suiteNames && suiteNames.length > 0;

		const inputCount = [hasClassNames, hasMethodNames, hasSuiteNames].filter(Boolean).length;
		if (inputCount > 1) {
			throw new Error('You can only specify one input type: either classNames, methodNames, or suiteNames. Multiple input types are not allowed.');
		}

		if (!(classNames.length || methodNames.length || suiteNames.length)) {
			if (client.supportsCapability('elicitation')) {
				const elicitResult = await classNameElicitation();
				const selectedClassName = elicitResult.content?.confirm;
				if (elicitResult.action !== 'accept' || !selectedClassName) {
					throw new Error('User has cancelled the Apex test run');
				}
				classNames = [selectedClassName];
			} else {
				throw new Error('Test class/method name required');
			}
		} else {
			classNames = classNames.filter((className) => typeof className === 'string');
			methodNames = methodNames.filter((methodName) => typeof methodName === 'string');
			suiteNames = suiteNames.filter((suiteName) => typeof suiteName === 'string');
		}

		let testRunId;
		if (methodNames?.length) {
			// Case B: only specific methods, ignore classNames
			testRunId = await runApexTest([], methodNames, []);
		} else if (classNames?.length) {
			// Case A: only whole classes, ignore methodNames
			testRunId = await runApexTest(classNames, [], []);
		} else if (suiteNames?.length) {
			// Case C: only whole suites, ignore classNames and methodNames
			testRunId = await runApexTest([], [], suiteNames);
		} else {
			throw new Error('You need to specify classNames, methodNames or suiteNames.');
		}

		if (!testRunId) {
			throw new Error('No test run Id returned by Salesforce CLI');
		}

		//const progressToken = classNames?.length > 1 ? _meta?.progressToken : null;
		// Polling to wait for test completion
		let testRunResult;
		while (true) {
			const testRunResults = await executeSoqlQuery(`SELECT Id, Status, StartTime, TestTime, TestSetupTime, ClassesEnqueued, ClassesCompleted, MethodsEnqueued, MethodsCompleted, MethodsFailed FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`);
			testRunResult = testRunResults.records[0];

			if (!testRunResult || (testRunResult.Status !== 'Processing' && testRunResult.Status !== 'Queued')) {
				//notifyProgressChange(progressToken, testRunResult.MethodsEnqueued, testRunResult.MethodsEnqueued, 'Test finished');
				break;
			}
			//const progress = testRunResult.MethodsCompleted + testRunResult.MethodsFailed;
			//notifyProgressChange(progressToken, testRunResult.MethodsEnqueued, progress, 'Running the test...');

			await new Promise((resolve) => setTimeout(resolve, 8000)); //Polling every 8 seconds
		}

		// Verify that we have a valid testRunResult before proceeding
		if (!testRunResult?.Id) {
			throw new Error('No valid test run result found. The test may have failed to start or complete.');
		}

		// Get the final test results
		const testResults = await executeSoqlQuery(`SELECT ApexClass.Name, MethodName, Outcome, RunTime, Message, StackTrace FROM ApexTestResult WHERE ApexTestRunResultId = '${testRunResult.Id}'`);

		if (!Array.isArray(testResults.records)) {
			throw new Error(`The result of executeSoqlQuery does not contain an array of records. Received value: ${JSON.stringify(testResults)}`);
		}

		const result = testResults.records.map((r) => ({
			className: r.ApexClass?.Name,
			methodName: r.MethodName,
			status: r.Outcome,
			runtime: r.RunTime,
			message: r.Message,
			stackTrace: r.StackTrace
		}));

		let structuredContent = {result};

		if (options.thenGetApexClassesCodeCoverage) {
			const codeCoverage = await getApexClassCodeCoverage(options.thenGetApexClassesCodeCoverage);
			structuredContent = {...structuredContent, codeCoverage};
		}

		return {
			content: [
				{
					type: 'text',
					text: 'Successfully ran Apex tests'
				}
			],
			structuredContent
		};
	} catch (error) {
		logger.error(error, 'Error running Apex tests');
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: error.message
				}
			]
		};
	}
}
