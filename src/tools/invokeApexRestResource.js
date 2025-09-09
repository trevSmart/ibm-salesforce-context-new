import fs from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {callSalesforceApi} from '../lib/salesforceServices.js';
import {state} from '../mcp-server.js';
import {textFileContent} from '../utils.js';

const logger = createModuleLogger(import.meta.url);

export const invokeApexRestResourceToolDefinition = {
	name: 'invokeApexRestResource',
	title: 'Invoke Apex REST Resource',
	description: await textFileContent('tools/invokeApexRestResource.md'),
	inputSchema: {
		apexClassOrRestResourceName: z.string().describe('Name of the Apex REST resource or name of its containing Apex class'),
		operation: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('The HTTP operation to perform'),
		bodySerialized: z.string().optional().describe('The request body for the HTTP request (serialized as a JSON string)'),
		bodyObject: z.record(z.any()).optional().describe('The request body for the HTTP request (object)'),
		urlParams: z.record(z.any()).optional().describe('URL parameters to append to the endpoint (object)'),
		headers: z.record(z.string()).optional().describe('Additional headers to include in the request (object)')
	},
	annotations: {
		readOnlyHint: false,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Invoke Apex REST Resource'
	}
};

export async function invokeApexRestResourceToolHandler({apexClassOrRestResourceName, operation, bodySerialized, bodyObject, urlParams, headers}) {
	// Process request body first (outside try block so it's available in catch)
	let body;

	if (bodySerialized) {
		try {
			// Validate it's valid JSON, then pass the string directly
			JSON.parse(bodySerialized);
			body = bodySerialized;
		} catch (error) {
			throw new Error(`Invalid JSON in bodySerialized: ${error.message}`);
		}
	} else if (bodyObject) {
		try {
			// Serialize bodyObject to JSON string
			body = JSON.stringify(bodyObject);
		} catch (error) {
			throw new Error(`Failed to serialize bodyObject to JSON: ${error.message}`);
		}
	}
	// If neither bodySerialized nor bodyObject is provided, body remains undefined
	// This is valid for operations like GET or DELETE that don't require a body

	try {
		// Validate required parameters
		if (!apexClassOrRestResourceName?.trim()) {
			throw new Error('Missing or invalid Apex REST resource/Apex class name');
		}

		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(operation?.trim())) {
			throw new Error('Invalid operation');
		}

		// Check if we have authentication
		if (!(state?.org?.instanceUrl && state?.org?.accessToken)) {
			throw new Error('Not authenticated to Salesforce. Please authenticate first');
		}

		try {
			const apexClassFilename = `${apexClassOrRestResourceName}${apexClassOrRestResourceName.endsWith('.cls') ? '' : '.cls'}`;
			const apexClassFilePath = path.join(process.cwd(), `force-app/main/default/classes/${apexClassFilename}`);
			logger.debug(`Apex class file path: ${apexClassFilePath}`);

			const apexClassPath = path.join(process.cwd(), `force-app/main/default/classes/${apexClassFilename}`);
			await fs.access(apexClassPath);

			logger.debug(`Apex class exists in local file system: ${apexClassPath}`);

			// Read the Apex class file to find the REST resource annotation
			const fileContent = await fs.readFile(apexClassPath, 'utf8');

			const pattern = /@RestResource\s*\(\s*urlMapping\s*=\s*['"]\/?(.*?)['"](\s*\))?/i;
			const matcher = pattern.exec(fileContent);

			if (matcher?.[1]) {
				// Extract the path and clean it from wildcards and trailing slashes
				const extractedPath = matcher[1].replace(/\/\*$|\*$|\/$/, '');
				logger.debug(`Found Apex REST resource name in Apex class URL mapping: ${extractedPath}`);
				apexClassOrRestResourceName = extractedPath;
			} else {
				throw new Error(`Could not find Apex REST resource in local file system for ${apexClassOrRestResourceName}. Continuing with provided name.`);
			}
		} catch {
			logger.debug(`Could not find Apex REST resource in local file system for ${apexClassOrRestResourceName}. Continuing with provided name.`);
		}

		if (!apexClassOrRestResourceName?.trim()) {
			throw new Error('Missing or invalid Apex REST resource/Apex class name');
		}

		// Prepare request options
		const requestOptions = {headers: headers || null, queryParams: urlParams || null};

		logger.debug(`Invoking Apex REST Resource "${apexClassOrRestResourceName}" (${operation}) and body ${body}`);

		// Make the API call
		const response = await callSalesforceApi(operation, 'APEX', apexClassOrRestResourceName, body, requestOptions);

		logger.debug(`Apex REST Resource "${apexClassOrRestResourceName}" (${operation}) call completed`);

		// Construct the endpoint URL
		const endpoint = `${state.org.instanceUrl}/services/apexrest/${apexClassOrRestResourceName}`;

		// Structure the response according to expected format
		const structuredResponse = {
			endpoint,
			request: {
				method: operation,
				headers: headers || {},
				body: body || null
			},
			responseBody: response,
			status: 200 // Assuming success since callSalesforceApi throws on error
		};

		return {
			content: [
				{
					type: 'text',
					text: `Successfully called "${apexClassOrRestResourceName}" Apex rest resource`
				}
			],
			structuredContent: structuredResponse
		};
	} catch (error) {
		// Construct the endpoint URL for error case
		const endpoint = state?.org?.instanceUrl ? `${state.org.instanceUrl}/services/apexrest/${apexClassOrRestResourceName}` : `/services/apexrest/${apexClassOrRestResourceName}`;

		// Structure the error response according to expected format
		const structuredError = {
			endpoint,
			request: {
				method: operation,
				headers: headers || {},
				body: body || null
			},
			response: error.message,
			status: 500 // Error status code
		};

		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `Error invoking Apex REST Resource "${apexClassOrRestResourceName}" (${operation}): ${error.message}`
				}
			],
			structuredContent: structuredError
		};
	}
}
