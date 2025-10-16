import {z} from 'zod';
import client from '../client.js';
import config from '../config.js';
import {createModuleLogger} from '../lib/logger.js';
import {applyFetchSslOptions} from '../lib/networkUtils.js';
import {executeAnonymousApex, getOrgAndUserDetails} from '../lib/salesforceServices.js';
import {clearResources, newResource, resources, sendProgressNotification} from '../mcp-server.js';
import {state} from '../state.js';
import {formatDate, textFileContent, addResourceToContent} from '../utils.js';

const logger = createModuleLogger(import.meta.url);

export const salesforceContextUtilsToolDefinition = {
	name: 'salesforceContextUtils',
	title: 'IBM Salesforce Context Utils',
	description: await textFileContent('tools/salesforceContextUtils.md'),
	inputSchema: {
		action: z.enum(['clearCache', 'getCurrentDatetime', 'getState', 'reportIssue', 'loadRecordPrefixesResource', 'getOrgAndUserDetails']).describe('The action to perform: "clearCache", "getCurrentDatetime", "getState", "reportIssue", "loadRecordPrefixesResource", "getOrgAndUserDetails"'),
		issueDescription: z.string().optional().describe('Detailed description of the issue and context from recent conversation messages (required for reportIssue action)'),
		issueToolName: z.string().optional().describe('Name of the tool that failed or needs improvement (optional)')
	},
	annotations: {
		readOnlyHint: false,
		idempotentHint: false,
		openWorldHint: false,
		title: 'IBM Salesforce Context Utils'
	}
};

// Helper function to generate manual titles when sampling is not available
function generateManualTitle(toolName) {
	let title = 'Issue';

	if (toolName && toolName !== 'Unknown') {
		title += ` in ${toolName}`;
	}

	title += ': Technical problem reported';

	return title;
}

export async function salesforceContextUtilsToolHandler({action, issueDescription, issueToolName}, args) {
	const progressToken = args?._meta?.progressToken;

	try {
		if (action === 'clearCache') {
			clearResources();
			return {
				content: [
					{
						type: 'text',
						text: '✅ Successfully cleared cached resources'
					}
				],
				structuredContent: {action, status: 'success'}
			};
		} else if (action === 'getCurrentDatetime') {
			const now = new Date();

			const result = {
				now,
				nowLocaleString: now.toLocaleString(),
				nowIsoString: now.toISOString(),
				timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone
			};

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(result, null, 2)
					}
				],
				structuredContent: result
			};
		} else if (action === 'getState') {
			return {
				content: [
					{
						type: 'text',
						text: 'Successfully retrieved the internal state of the MCP server'
					}
				],
				structuredContent: {state, client, resources}
			};
		} else if (action === 'loadRecordPrefixesResource') {
			const content = [];
			let structuredContent = {};
			const resourceUri = 'mcp://prefixes/recordPrefixes.csv';
			let data = [];
			const recordPrefixesResource = resources[resourceUri];
			if (recordPrefixesResource) {
				data = JSON.parse(recordPrefixesResource.text);
				content.push({type: 'text', text: '✅ Object record prefixes resource already loaded'});
			} else {
				// Load Apex script content via generalized textFileContent helper.
				// Works in dev (src/static/*.apex) and in packaged builds (src/static/*.apex.pam).
				const apexScript = await textFileContent('static/retrieve-sobject-prefixes.apex');
				if (!apexScript) {
					throw new Error('No retrieve-sobject-prefixes.apex(.pam) content found under static');
				}
				const result = await executeAnonymousApex(apexScript);
				if (result.success) {
					const resultLogs = result.logs;
					data = resultLogs
						.split('\n')
						.filter((line) => line.trim() && line.includes('USER_DEBUG'))
						.map((line) => {
							const lastPipeIndex = line.lastIndexOf('|');
							return lastPipeIndex !== -1 ? line.substring(lastPipeIndex + 1) : line;
						})
						.filter((line) => line.trim()); // Remove any empty lines after processing

					// Create new resource
					newResource(resourceUri, 'SObject record prefixes list', 'This resource contains a list of SObject record prefixes.', 'application/json', JSON.stringify(data, null, '\t'), {audience: ['user', 'assistant']});

					content.push({
						type: 'text',
						text: '✅ Object record prefixes resource loaded successfully'
					});
				} else {
					throw new Error(`Failed to load record prefixes: ${result.error}`);
				}
			}

			// Ensure data is an array before transformation
			if (!Array.isArray(data)) {
				logger.warn('Data is not an array, converting to array format');
				data = [];
			}

			// Transform the array data into the desired object format
			const transformedData = {};
			for (const item of data) {
				if (typeof item === 'string') {
					const [objectName, prefix] = item.split(',');
					if (objectName?.trim() && prefix?.trim()) {
						transformedData[prefix.trim()] = objectName.trim();
					}
				}
			}

			// Include required fields for ResourceLink per MCP schema
			let res = resources[resourceUri] || null;
			if (!res) {
				res = newResource(resourceUri, 'recordPrefixes.json', 'application/json', 'SObject record prefixes list', {audience: ['user', 'assistant']});
			}

			addResourceToContent(content, res);
			structuredContent = transformedData;

			return {
				content,
				structuredContent
			};
		} else if (action === 'getOrgAndUserDetails') {
			const orgAndUserDetails = await getOrgAndUserDetails();
			const companyDetails = orgAndUserDetails?.companyDetails ?? state.org?.companyDetails ?? null;
			const result = {
				content: [
					{
						type: 'text',
						text: 'Successfully retrieved the org and user details'
					}
				],
				structuredContent: {...orgAndUserDetails, companyDetails}
			};
			logger.info(result);
			return result;
		} else if (action === 'reportIssue') {
			if (progressToken) {
				sendProgressNotification(progressToken, 1, 3, 'Starting reportIssue');
			}

			// Validate required fields for reportIssue
			if (!issueDescription || issueDescription.trim().length < 10) {
				throw new Error('For the reportIssue action, issueDescription is required and must be at least 10 characters long');
			}

			// Fix issue type as "bug" and derive title from description
			const issueType = 'bug';
			const cleanDescription = issueDescription.trim();

			// Try to generate title using sampling capability if available
			let title;
			let detectedToolName = issueToolName;

			// Fix severity to medium
			const issueSeverity = 'medium';

			// Import required dependencies at the beginning
			let mcpServer;
			try {
				const mcpServerModule = await import('../mcp-server.js');
				mcpServer = mcpServerModule.mcpServer;
			} catch (importError) {
				logger.debug(`Error importing mcp-server: ${importError.message}`);
				mcpServer = null;
			}

			if (client.supportsCapability('sampling') && mcpServer) {
				try {
					// If no tool name specified, try to detect it from description
					if (!detectedToolName || detectedToolName === 'Unknown') {
						const toolDetectionPrompt = `## Issue Description ##
${issueDescription}

## Task ##
Analyze this issue description and determine which one of the MCP server's tools is most likely affected. Look for:
- Tool names mentioned (e.g., "executeSoqlQuery", "describeObject", "dmlOperation", "getSetupAuditTrail")
- Functionality described (e.g., "query execution", "object description", "record creation", "audit trail", "setup audit")
- Error messages that might indicate the tool
- Specific features mentioned (e.g., "Setup Audit Trail" → "getSetupAuditTrail")

If you can clearly identify the tool, return only the tool name.
If the description is unclear or could apply to multiple tools, return "Unknown".

Return only the tool name or "Unknown" without any explanation.

IMPORTANT: Generate your response in English.`;

						const toolDetectionResponse = await mcpServer.server.createMessage({
							messages: [{role: 'user', content: {type: 'text', text: toolDetectionPrompt}}],
							systemPrompt: 'You are a customer support expert. Analyze problem description to tell whether it has enough information to open an issue. In case there is, identify which tool the problem is related to.',
							modelPreferences: {speedPriority: 0, intelligencePriority: 1},
							maxTokens: 50
						});

						const detectedTool = toolDetectionResponse.content[0].text.trim();
						if (detectedTool && detectedTool !== 'Unknown' && detectedTool.length < 50) {
							detectedToolName = detectedTool;
						}
					}

					// Create sampling prompt for validation and enhanced description generation
					const validationPrompt = `## Issue Description ##
${issueDescription}

## Tool Information ##
Tool: ${detectedToolName}
Severity: ${issueSeverity || 'medium'}

## Task ##
Analyze this issue description and determine if it contains sufficient details to create a meaningful technical issue report. Consider:
- Is there a clear problem description?
- Are there specific error messages or symptoms?
- Is the context clear enough to understand what went wrong?
- Are there steps to reproduce or specific conditions mentioned?

Respond with a JSON object containing:
- "valid": boolean - true if there are sufficient details, false if not
- "description": string - if valid=true, provide an enhanced, detailed description; if valid=false, explain what details are missing

Example response:
{"valid": true, "description": "Enhanced description with more context..."}
or
{"valid": false, "description": "Missing details: specific error message, reproduction steps, etc."}

IMPORTANT: Generate your response in English and return only valid JSON.`;

					// Validate and enhance description using sampling capability
					const validationResponse = await mcpServer.server.createMessage({
						messages: [{role: 'user', content: {type: 'text', text: validationPrompt}}],
						systemPrompt: 'You are a technical issue report specialist. Analyze issue descriptions for completeness and enhance them when possible.',
						modelPreferences: {speedPriority: 0, intelligencePriority: 1},
						maxTokens: 500
					});

					let validationResult;
					try {
						validationResult = JSON.parse(validationResponse.content[0].text.trim());
					} catch (parseError) {
						logger.debug(`Error parsing validation response: ${parseError.message}`);
						throw new Error('Failed to parse validation response');
					}

					if (!validationResult.valid) {
						throw new Error(`Insufficient details for issue report: ${validationResult.description}`);
					}

					// Use enhanced description for title generation
					const enhancedDescription = validationResult.description;

					// Generate title from enhanced description
					const titlePrompt = `## Enhanced Issue Description ##
${enhancedDescription}

## Tool Information ##
Tool: ${detectedToolName}
Severity: ${issueSeverity || 'medium'}

## Task ##
Generate a concise, descriptive title for this issue report. The title should be:
- Clear and specific
- Under 60 characters
- Professional and technical
- Focus on the main problem

Return only the title without any explanation or formatting.

IMPORTANT: Generate your response in English.`;

					const titleResponse = await mcpServer.server.createMessage({
						messages: [{role: 'user', content: {type: 'text', text: titlePrompt}}],
						systemPrompt: 'You are a technical issue report specialist. Generate concise, professional titles for technical issues.',
						modelPreferences: {speedPriority: 0, intelligencePriority: 1},
						maxTokens: 100
					});

					title = titleResponse.content[0].text.trim();

					// Update issueDescription with enhanced version
					issueDescription = enhancedDescription;

					// Fallback if generated title is too long or empty
					if (!title || title.length > 60) {
						title = enhancedDescription.length > 60 ? `${enhancedDescription.substring(0, 60)}...` : enhancedDescription;
					}
				} catch (error) {
					logger.debug(`Error generating title with sampling: ${error.message}`);
					// Fallback to manual title generation
					title = cleanDescription.length > 60 ? `${cleanDescription.substring(0, 60)}...` : cleanDescription;
				}
			} else {
				// Manual title generation when sampling is not available
				title = generateManualTitle(detectedToolName);
			}

			if (progressToken) {
				sendProgressNotification(progressToken, 2, 3, 'Generating title');
			}

			// Check if client supports elicitation and ask for confirmation before sending issue
			if (client.supportsCapability('elicitation') && mcpServer) {
				const elicitResult = await mcpServer.server.elicitInput({
					message: `⚠️ Please confirm that you want to report this issue.\n\nTitle: ${title}\n\nTool: ${detectedToolName}\n\nDescription: ${issueDescription}`,
					requestedSchema: {
						type: 'object',
						title: 'Report issue?',
						properties: {
							confirm: {
								type: 'string',
								enum: ['Yes', 'No'],
								enumNames: ['Report issue now', 'Cancel issue report'],
								description: 'Report this issue?',
								default: 'Yes'
							}
						},
						required: ['confirm']
					}
				});

				if (elicitResult.action !== 'accept' || elicitResult.content?.confirm !== 'Yes') {
					return {
						content: [
							{
								type: 'text',
								text: 'User has cancelled the issue report'
							}
						],
						structuredContent: elicitResult
					};
				}
			}

			if (progressToken) {
				sendProgressNotification(progressToken, 3, 3, 'Done');
			}

			// Prepare issue data
			const issueData = {
				type: issueType,
				title: title,
				description: issueDescription,
				toolName: detectedToolName,
				severity: 'medium',
				date: formatDate(new Date()),
				reportedBy: state.user?.name || process.env.USER || process.env.USERNAME || 'Unknown',
				environment: {
					os: process.platform === 'darwin' ? 'Mac OS' : process.platform,
					user: process.env.USER || process.env.USERNAME || 'Unknown',
					nodeVersion: process.version,
					mcpProtocolVersion: config.serverConstants.protocolVersion
				},
				server: {
					serverInfo: config.serverConstants.serverInfo,
					capabilities: config.serverConstants.capabilities,
					workspacePath: process.cwd(),
					org: state.org
				},
				client: {
					clientInfo: client.clientInfo,
					capabilities: client.capabilities
				}
			};

			// Test-friendly dry-run mode to avoid creating real issues from tests
			if (String(process.env.MCP_REPORT_ISSUE_DRY_RUN || '').toLowerCase() === 'true') {
				const fake = {
					success: true,
					issueId: `DRY-RUN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
					issueUrl: 'about:blank#dry-run',
					message: 'Dry run: issue not sent to webhook',
					request: {type: issueType, title, tool: detectedToolName, severity: issueSeverity}
				};
				return {
					content: [{type: 'text', text: '✅ Dry run: issue report simulated (no webhook call)'}],
					structuredContent: fake
				};
			}

			try {
				// Send issue to Netlify webhook
				logger.info('Sending issue');
				const webhookRequest = {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(issueData)
				};
				const response = await fetch(config.issueReporting.webhookUrl, applyFetchSslOptions(config.issueReporting.webhookUrl, webhookRequest));

				if (response.ok) {
					const result = await response.json();

					if (result.success) {
						logger.info(`Issue created successfully: ${result.issueUrl}`);

						return {
							content: [
								{
									type: 'text',
									text: `Issue ${result.issueId} successfully created`
								}
							],
							structuredContent: result
						};
					} else {
						throw new Error(`Webhook error: ${result.error || 'Unknown error'}`);
					}
				} else {
					throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
				}
			} catch (error) {
				logger.error(error, 'Error sending issue');
				throw new Error(`Failed to send issue to webhook: ${error.message}`);
			}
		} else {
			throw new Error(`Invalid action: ${action}`);
		}
	} catch (error) {
		logger.error(error, 'Error in salesforceContextUtilsTool');
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `❌ Error: ${error.message}`
				}
			]
		};
	}
}
