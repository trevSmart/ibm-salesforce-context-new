/** biome-ignore-all lint/style/useNamingConvention: SObject fields are not camelCase */
import {z} from 'zod';
import client from '../client.js';
import {createModuleLogger} from '../lib/logger.js';
import {dmlOperation, executeSoqlQuery, runCliCommand} from '../lib/salesforceServices.js';
import {mcpServer, newResource, state} from '../mcp-server.js';
import {formatDate, textFileContent} from '../utils.js'; // ensureTmpDir, writeToTmpFile

// import path from 'path';
// import {execSync} from 'child_process';
const logger = createModuleLogger(import.meta.url);

export const apexDebugLogsToolDefinition = {
	name: 'apexDebugLogs',
	title: 'Manage Apex debug logs',
	description: await textFileContent('tools/apexDebugLogs.md'),
	inputSchema: {
		action: z.enum(['status', 'on', 'off', 'list', 'get']).describe('The action to perform. Possible values: "status", "on", "off", "list", "get".'),
		logId: z.string().optional().describe('The ID of the log to retrieve (only used when action is "get"; selection is prompted if not provided).')
		// analyzeOptions temporarily disabled while analyze action is not ready
		// analyzeOptions: z.object({
		// 	minDurationMs: z
		// 		.number()
		// 		.optional()
		// 		.default(0)
		// 		.describe('Filter out events shorter than this duration in milliseconds.'),
		// 	maxEvents: z
		// 		.number()
		// 		.optional()
		// 		.default(200)
		// 		.describe('Trim to the first N completed events after filtering.'),
		// 	output: z
		// 		.enum(['both', 'json', 'diagram'])
		// 		.optional()
		// 		.default('both')
		// 		.describe('Which artifacts to return in the tool output.')
		// }).optional().describe('Options for analyze action (only used when action is "analyze")')
	},
	annotations: {
		readOnlyHint: false,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Manage Apex debug logs'
	}
};

/*
async function analyzeApexLog(logContent, minDurationMs = 0, maxEvents = 200, output = 'both') {
	try {
		if (!logContent) {
			throw new Error('No log content provided');
		}

		const parseResult = parseApexLog(logContent);
		const {events} = buildCompletedEvents(parseResult);

		const filtered = events
			.filter(e => e.durationMs >= minDurationMs)
			.slice(0, Math.max(0, maxEvents));

		const summary = summarize(filtered);

		const fileBaseName = `apex_log_${Date.now()}`;
		const artifacts = {};

		// JSON resource and file
		const jsonText = JSON.stringify({summary, events: filtered}, null, 2);
		const jsonUri = `file://apex-log/${fileBaseName}.events.json`;
		newResource(jsonUri, `${fileBaseName}.events.json`, 'Structured Apex log events (filtered)', 'application/json', jsonText);
		const jsonPath = writeToTmpFile(jsonText, fileBaseName, 'events.json');
		artifacts.json = {uri: jsonUri, text: jsonText, path: jsonPath};

		// ASCII timeline resource and file
		const asciiText = renderAsciiTimeline(filtered, summary.totalDurationMs);
		const asciiUri = `file://apex-log/${fileBaseName}.txt`;
		newResource(asciiUri, `${fileBaseName}.txt`, 'ASCII timeline view of Apex log', 'text/plain', asciiText);
		const asciiPath = writeToTmpFile(asciiText, fileBaseName, 'txt');
		artifacts.ascii = {uri: asciiUri, text: asciiText, path: asciiPath};

		// Mermaid gantt resource and file
		const mermaidText = renderMermaidGantt(filtered, summary.totalDurationMs);
		const mermaidUri = `file://apex-log/${fileBaseName}.mermaid`;
		newResource(mermaidUri, `${fileBaseName}.mermaid`, 'Mermaid Gantt definition for Apex log', 'text/plain', mermaidText);
		const mermaidPath = writeToTmpFile(mermaidText, fileBaseName, 'mermaid');
		artifacts.mermaid = {uri: mermaidUri, text: mermaidText, path: mermaidPath};

		// PNG export to tmp folder
		const pngPath = await exportMermaidToPng(mermaidText, fileBaseName);
		artifacts.png = {path: pngPath};

		const contentBlocks = [];
		const lines = [];
		lines.push('Apex log analyzed successfully');
		lines.push(`Duration: ${summary.totalDurationMs.toFixed(2)} ms.`);
		lines.push(`Events (filtered): ${filtered.length}. Groups: ${Object.keys(summary.byType).join(', ')}`);
		lines.push('Top slowest events:');
		summary.top.forEach((e, idx) => {
			lines.push(`${idx + 1}. [${e.type}] ${e.name} — ${e.durationMs.toFixed(2)} ms`);
		});

		contentBlocks.push({type: 'text', text: lines.join('\n')});

		if (output === 'json' || output === 'both') {
			contentBlocks.push({type: 'text', text: `JSON: ${jsonUri} (file: ${artifacts.json.path})`});
		}
		if (output === 'diagram' || output === 'both') {
			contentBlocks.push({type: 'text', text: `Mermaid: ${mermaidUri} (file: ${artifacts.mermaid.path})`});
			contentBlocks.push({type: 'text', text: `ASCII: ${asciiUri} (file: ${artifacts.ascii.path})`});
			contentBlocks.push({type: 'text', text: `PNG: ${pngPath}`});
		}

		return {
			content: contentBlocks,
			structuredContent: {summary, artifacts}
		};

	} catch (error) {
		log(error, 'error');
		return {
			isError: true,
			content: [{type: 'text', text: `❌ Error analyzing Apex log: ${error.message}`}]
		};
	}
}

function parseApexLog(text) {
	const lines = text.split(/\r?\n/);
	const records = [];
	for (const line of lines) {
		// Example: "16:06:58.18 (54114689)|EXECUTION_FINISHED"
		//          "16:06:58.18 (52417923)|CODE_UNIT_FINISHED|execute_anonymous_apex"
		//          "16:06:58.18 (49590539)|CUMULATIVE_LIMIT_USAGE_END"
		//          "...|METHOD_ENTRY|...|ClassName.methodName|..."
		const match = line.match(/^[^(]*\((\d+)\)\|(\w+)(?:\|(.+))?$/);
		if (!match) {
			continue;
		}
		const [, nsStr, event, detailsRaw] = match;
		const ns = Number(nsStr);
		const details = detailsRaw || '';

		records.push({ns, event, raw: line, details});
	}
	return {records};
}

function buildCompletedEvents(parseResult) {
	const {records} = parseResult;
	if (records.length === 0) {
		return {events: [], totalDurationMs: 0};
	}

	const baseNs = records[0].ns;
	const stack = [];
	const events = [];

	function start(type, name, ns, meta = {}) {
		stack.push({type, name, ns, meta});
	}
	function end(matchingPredicate, ns) {
		for (let i = stack.length - 1; i >= 0; i--) {
			const it = stack[i];
			if (matchingPredicate(it)) {
				stack.splice(i, 1);
				const durationMs = (ns - it.ns) / 1e6;
				const startMs = (it.ns - baseNs) / 1e6;
				const endMs = startMs + durationMs;
				events.push({type: it.type, name: it.name, startMs, endMs, durationMs, meta: it.meta});
				return true;
			}
		}
		return false;
	}

	for (const r of records) {
		switch (r.event) {
			case 'CODE_UNIT_STARTED': {
				const name = r.details?.split('|')[0] || 'CodeUnit';
				start('Code Unit', name, r.ns);
				break;
			}
			case 'CODE_UNIT_FINISHED': {
				end(it => it.type === 'Code Unit', r.ns);
				break;
			}
			case 'METHOD_ENTRY': {
				const name = extractMethodName(r.details) || 'Method';
				start('Method', name, r.ns);
				break;
			}
			case 'METHOD_EXIT': {
				end(it => it.type === 'Method', r.ns);
				break;
			}
			case 'SOQL_EXECUTE_BEGIN': {
				const name = extractSoql(r.details);
				start('SOQL', name, r.ns);
				break;
			}
			case 'SOQL_EXECUTE_END': {
				end(it => it.type === 'SOQL', r.ns);
				break;
			}
			case 'DML_BEGIN': {
				const name = extractDml(r.details);
				start('DML', name, r.ns);
				break;
			}
			case 'DML_END': {
				end(it => it.type === 'DML', r.ns);
				break;
			}
			case 'FLOW_START_INTERVIEW':
			case 'FLOW_ELEMENT_BEGIN': {
				const name = (r.details || 'Flow');
				start('Flow', name, r.ns);
				break;
			}
			case 'FLOW_ELEMENT_END':
			case 'FLOW_END_INTERVIEW': {
				end(it => it.type === 'Flow', r.ns);
				break;
			}
			case 'WF_RULE_EVAL_BEGIN':
			case 'WF_RULE_FILTER': {
				start('Workflow', r.details || 'Workflow', r.ns);
				break;
			}
			case 'WF_RULE_EVAL_END': {
				end(it => it.type === 'Workflow', r.ns);
				break;
			}
			default:
				// Ignore
				break;
		}
	}

	const totalDurationMs = (records[records.length - 1].ns - baseNs) / 1e6;
	return {events, totalDurationMs};
}

function extractMethodName(details) {
	if (!details) {
		return null;
	}
	const parts = details.split('|');
	const candidate = parts.find(p => /\w+\.\w+/.test(p));
	return candidate || parts[parts.length - 1] || 'Method';
}

function extractSoql(details) {
	if (!details) {
		return 'SOQL';
	}
	const m = details.match(new RegExp('SELECT[\\s\\S]*', 'i'));
	let q = m ? m[0] : 'SOQL';
	q = q.replace(/\s+/g, ' ').trim();
	if (q.length > 120) {
		q = q.slice(0, 117) + '...';
	}
	return q;
}

function extractDml(details) {
	if (!details) {
		return 'DML';
	}
	const op = details.split('|')[0] || 'DML';
	return op;
}

function summarize(events) {
	const byType = {};
	for (const e of events) {
		byType[e.type] = byType[e.type] || {count: 0, durationMs: 0};
		byType[e.type].count += 1;
		byType[e.type].durationMs += e.durationMs;
	}
	const top = [...events].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10);
	return {totalDurationMs: events.reduce((sum, e) => sum + e.durationMs, 0), byType, top};
}

function renderAsciiTimeline(events, totalDurationMs) {
	const width = 100; // characters
	const lines = [];
	lines.push('ASCII timeline (relative to log start)');
	for (const e of events) {
		const startPos = Math.max(0, Math.floor((e.startMs / totalDurationMs) * width));
		const endPos = Math.min(width, Math.floor((e.endMs / totalDurationMs) * width));
		const bar = ' '.repeat(startPos) + '#'.repeat(Math.max(1, endPos - startPos));
		const label = `[${e.type}] ${e.name}`;
		lines.push(bar + ' ' + label);
	}
	return lines.join('\n');
}

function renderMermaidGantt(events) { //(events, totalDurationMs)
	// Mermaid Gantt requires absolute seconds. Use current epoch as base and add offsets in seconds.
	const baseEpoch = Math.floor(Date.now() / 1000);
	let out = 'gantt\n';
	out += '  title Apex Log Timeline (best-effort)\n';
	out += '  dateFormat X\n';
	out += '  axisFormat %S s\n';

	const byType = new Map();
	for (const e of events) {
		if (!byType.has(e.type)) {
			byType.set(e.type, []);
		}
		byType.get(e.type).push(e);
	}

	let id = 0;
	for (const [type, group] of byType.entries()) {
		out += `  section ${escapeMermaid(type)}\n`;
		for (const e of group) {
			id += 1;
			const start = baseEpoch + Math.max(0, Math.floor(e.startMs / 1000));
			const end = baseEpoch + Math.max(0, Math.ceil(e.endMs / 1000));
			const name = escapeMermaid(truncate(`${e.name} (${e.durationMs.toFixed(1)} ms)`, 80));
			out += `  ${name} :t${id}, ${start}, ${end}\n`;
		}
	}
	return out;
}

function truncate(s, max) {
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function escapeMermaid(s) {
	return s.replace(/:/g, '-').replace(/\[/g, '(').replace(/\]/g, ')');
}

async function exportMermaidToPng(mermaidText, fileBaseName) {
	try {
		const tmpDir = ensureTmpDir();

		const pngPath = path.join(tmpDir, `${fileBaseName}.png`);

		// Try to use mmdc (Mermaid CLI) if available
		try {
			execSync(`mmdc -i - -o "${pngPath}"`, {
				input: mermaidText,
				stdio: ['pipe', 'pipe', 'pipe']
			});
			log(`PNG exported to: ${pngPath}`, 'info');
			return pngPath;

		} catch (mmdcError) {
			log(`mmdc not available, falling back to text file: ${mmdcError.message}`, 'warning');

			// Fallback: save Mermaid text to tmp folder
			const mermaidPath = writeToTmpFile(mermaidText, fileBaseName, 'mermaid');
			log(`Mermaid text saved to: ${mermaidPath}`, 'info');
			return mermaidPath;
		}

	} catch (error) {
		log(`Error exporting diagram: ${error.message}`, 'warning');
		throw error;
	}
}
*/

export async function apexDebugLogsToolHandler({action, logId}) {
	// analyzeOptions
	try {
		if (!['status', 'on', 'off', 'list', 'get'].includes(action)) {
			throw new Error(`Invalid action: ${action}`);
		}

		const user = state?.org?.user;
		logger.debug(`User data: ${JSON.stringify(user)}`);
		if (!user) {
			throw new Error('User data not found');
		}

		if (action === 'status') {
			logger.debug('Checking already existing TraceFlag...');

			const soqlTraceFlagResult = await executeSoqlQuery(`SELECT Id, StartDate, ExpirationDate, DebugLevel.DeveloperName FROM TraceFlag WHERE TracedEntityId = '${user.id}' AND StartDate < ${new Date().toISOString()} AND ExpirationDate > ${new Date().toISOString()} LIMIT 1`, true);
			const traceFlag = soqlTraceFlagResult?.records?.[0];

			if (traceFlag) {
				const startDate = new Date(traceFlag.StartDate);
				const expirationDate = new Date(traceFlag.ExpirationDate);
				const now = new Date();
				const status = startDate < now && expirationDate > now ? '🟢 Active' : '🟥 Inactive';

				return {
					content: [
						{
							type: 'text',
							text: `Apex debug logs status for user ${user.name} in ${state?.org?.alias}: ${status}.`
						}
					],
					structuredContent: {
						user: user.name,
						status,
						traceFlagId: traceFlag.Id,
						startDate: formatDate(startDate),
						expirationDate: formatDate(expirationDate),
						debugLevel: traceFlag?.DebugLevel?.DeveloperName || null
					}
				};
			} else {
				return {
					content: [
						{
							type: 'text',
							text: `Apex debug logs status for user ${user.name} in ${state?.org?.alias}: 🟥 Inactive`
						}
					],
					structuredContent: {status: 'inactive', traceFlag: null}
				};
			}
		} else if (action === 'on') {
			//1. Check if there's already an active TraceFlag
			logger.debug('Checking for already active TraceFlag...');
			const soqlActiveTraceFlagResult = await executeSoqlQuery(`SELECT Id, StartDate, ExpirationDate, DebugLevel.DeveloperName FROM TraceFlag WHERE TracedEntityId = '${user.id}' AND LogType = 'DEVELOPER_LOG' AND ExpirationDate > ${new Date().toISOString()}`, true);
			const activeTraceFlag = soqlActiveTraceFlagResult?.records?.[0];

			if (activeTraceFlag) {
				// Extend the expiration date by 1 hour from now
				const now = new Date();
				const newExpirationDate = new Date(now.getTime() + 60 * 60_000); //1 hour from now
				await dmlOperation(
					{
						update: [
							{
								sObjectName: 'TraceFlag',
								recordId: activeTraceFlag.Id,
								fields: {ExpirationDate: newExpirationDate.toISOString()}
							}
						]
					},
					{useToolingApi: true}
				);

				const startDate = new Date(activeTraceFlag.StartDate);

				return {
					content: [
						{
							type: 'text',
							text: `Debug logs were already active for ${user.name} in ${state?.org?.alias}. Extended expiration date for the next hour, new expiration date is ${formatDate(newExpirationDate)}.`
						}
					],
					structuredContent: {
						user: user.name,
						traceFlagId: activeTraceFlag.Id,
						status: startDate < now && newExpirationDate > now ? '🟢 Active' : '🟥 Inactive',
						startDate: formatDate(startDate),
						expirationDate: formatDate(newExpirationDate),
						debugLevel: activeTraceFlag.DebugLevel?.DeveloperName || null
					}
				};
			}

			//2. Find or create DebugLevel with DeveloperName=ReplayDebuggerLevels
			const soqlDebugLevelResult = await executeSoqlQuery("SELECT Id FROM DebugLevel WHERE DeveloperName = 'ReplayDebuggerLevels' LIMIT 1", true);
			let debugLevelId = soqlDebugLevelResult?.records?.[0]?.Id;

			if (!debugLevelId) {
				logger.debug('DebugLevel not found. Creating new DebugLevel...');
				const debugLevelResult = await dmlOperation(
					{
						create: [
							{
								sObjectName: 'DebugLevel',
								fields: {
									DeveloperName: 'ReplayDebuggerLevels',
									MasterLabel: 'ReplayDebuggerLevels',
									ApexCode: 'FINEST',
									Visualforce: 'FINER'
								}
							}
						]
					},
					{useToolingApi: true}
				);
				debugLevelId = debugLevelResult.successes?.[0]?.id;
			}

			const now = new Date();
			const startDate = new Date(now);
			const expirationDate = new Date(startDate.getTime() + 60 * 60_000); //1 hour
			const traceFlagResult = await dmlOperation(
				{
					create: [
						{
							sObjectName: 'TraceFlag',
							fields: {
								TracedEntityId: user.id,
								DebugLevelId: debugLevelId,
								LogType: 'DEVELOPER_LOG',
								StartDate: startDate.toISOString(),
								ExpirationDate: expirationDate.toISOString()
							}
						}
					]
				},
				{useToolingApi: true}
			);

			logger.debug(traceFlagResult, 'Create TraceFlag result');

			const newTraceFlagId = traceFlagResult.successes?.[0]?.id;

			return {
				content: [
					{
						type: 'text',
						text: `Apex debug logs status for ${user.name} in ${state?.org?.alias}: active`
					}
				],
				structuredContent: {
					traceFlagId: newTraceFlagId,
					status: startDate <= now && now <= expirationDate ? '🟢 Active' : '🟥 Inactive',
					startDate: formatDate(startDate),
					expirationDate: formatDate(expirationDate),
					debugLevelName: 'ReplayDebuggerLevels'
				}
			};
		} else if (action === 'off') {
			const soqlTraceFlagResult = await executeSoqlQuery(`SELECT Id, DebugLevelId FROM TraceFlag WHERE TracedEntityId = '${user.id}' AND ExpirationDate >= ${new Date().toISOString()}`, true);
			const traceFlag = soqlTraceFlagResult?.records?.[0];

			if (!traceFlag) {
				return {
					content: [
						{
							type: 'text',
							text: `Debug logs were already inactive for ${user.name} in ${state?.org?.alias}, no action taken`
						}
					],
					structuredContent: {}
				};
			}

			const newExpirationDate = new Date(Date.now() + 10_000); // 10 seconds in the future
			await dmlOperation(
				{
					update: [
						{
							sObjectName: 'TraceFlag',
							recordId: traceFlag.Id,
							fields: {ExpirationDate: newExpirationDate.toISOString()}
						}
					]
				},
				{useToolingApi: true}
			);

			return {
				content: [
					{
						type: 'text',
						text: `Apex debug logs status for ${user.name} in ${state?.org?.alias}: 🟥 Inactive`
					}
				],
				structuredContent: {
					...traceFlag,
					status: '🟥 Inactive',
					expirationDate: formatDate(newExpirationDate)
				}
			};
		} else if (action === 'list') {
			const response = await runCliCommand('sf apex list log --json');
			let logs = [];

			try {
				const parsedResponse = JSON.parse(response);
				logs = parsedResponse?.result || [];
			} catch (error) {
				logger.error(`Error parsing JSON response: ${error.message}`);
				logs = [];
			}

			if (logs && Array.isArray(logs)) {
				// Take only the first 50 logs and format them
				logs = logs.slice(0, 30).map((logItem) => {
					if (logItem.LogLength) {
						const lengthInBytes = Number.parseInt(logItem.LogLength, 10);
						if (lengthInBytes < 1024 * 1024) {
							logItem.LogLength = `${Math.floor(lengthInBytes / 1024)} KB`;
						} else {
							logItem.LogLength = `${(lengthInBytes / (1024 * 1024)).toFixed(1)} MB`;
						}
					}

					// Convert duration from DurationMilliseconds to seconds
					if (logItem.DurationMilliseconds) {
						const durationMs = Number.parseInt(logItem.DurationMilliseconds, 10);
						if (durationMs < 1000) {
							logItem.duration = `${durationMs}ms`;
						} else {
							logItem.duration = `${Math.floor(durationMs / 1000)}s`;
						}
						// Remove the original attribute
						delete logItem.DurationMilliseconds;
					}

					logItem.StartTime = formatDate(new Date(logItem.StartTime));
					return logItem;
				});
			} else {
				logs = [];
			}

			return {
				content: [
					{
						type: 'text',
						text: `${logs.length} Apex debug logs found in ${state?.org?.alias}`
					}
				],
				structuredContent: {logs}
			};
		} else if (action === 'get') {
			if (!logId) {
				if (client.supportsCapability('elicitation')) {
					// Get the list of available logs for selection
					const response = await runCliCommand('sf apex list log --json');
					let logs = [];

					try {
						const parsedResponse = JSON.parse(response);
						logs = parsedResponse?.result || [];
					} catch (error) {
						logger.error(`Error parsing JSON response: ${error.message}`);
						logs = [];
					}

					if (!(logs && Array.isArray(logs)) || logs.length === 0) {
						throw new Error('No Apex debug logs available for selection');
					}

					// Take only the first 50 logs and format them for selection
					const availableLogs = logs.slice(0, 50).map((logItem) => {
						// Check if the log is from today
						const today = new Date().toDateString();
						const logDate = new Date(logItem.StartTime);
						const isToday = logDate.toDateString() === today;
						let startTime;
						if (isToday) {
							startTime = logDate.toLocaleTimeString('es-ES', {
								hour: 'numeric',
								minute: '2-digit',
								second: '2-digit',
								hour12: false
							});
						} else {
							startTime =
								logDate.toLocaleDateString('es-ES', {
									day: 'numeric',
									month: 'numeric',
									year: '2-digit'
								}) +
								' ' +
								logDate.toLocaleTimeString('es-ES', {
									hour: 'numeric',
									minute: '2-digit',
									second: '2-digit',
									hour12: false
								});
						}

						const logUser = logItem.LogUser.Name || 'Unknown user';
						const operation = logItem.Operation || 'Unknown operation';
						const size = logItem.LogLength ? (Number.parseInt(logItem.LogLength, 10) < 1024 * 1024 ? `${Math.floor(Number.parseInt(logItem.LogLength, 10) / 1024)} KB` : `${(Number.parseInt(logItem.LogLength, 10) / (1024 * 1024)).toFixed(1)} MB`) : 'N/A';

						return {
							id: logItem.Id,
							description: `${startTime} - ${logUser} - ${operation} (${size})  →  ${logItem.Status === 'Success' ? '✅ Success' : `❌ ${logItem.Status}`}`
						};
					});

					const elicitResult = await mcpServer.server.elicitInput({
						message: `Please select an Apex debug log to retrieve. Available logs: ${availableLogs.length}`,
						requestedSchema: {
							type: 'object',
							title: 'Select Apex debug log to retrieve',
							properties: {
								logId: {
									type: 'string',
									enum: availableLogs.map((logItem) => logItem.id),
									enumNames: availableLogs.map((logItem) => logItem.description),
									description: 'Select the Apex debug log to retrieve'
								}
							},
							required: ['logId']
						}
					});

					if (elicitResult.action !== 'accept' || !elicitResult.content?.logId) {
						return {
							isError: true,
							content: [
								{
									type: 'text',
									text: 'User has cancelled the log selection'
								}
							]
						};
					}

					logId = elicitResult.content.logId;
				} else {
					throw new Error('logId is required for the "get" action');
				}
			}

			const apexLog = await runCliCommand(`sf apex get log --log-id ${logId}`);

			const content = [
				{
					type: 'text',
					text: `Succesfully retrieved Apex debug log ${logId}`
				}
			];

			const uri = `mcp://apexLogs/${logId}.log`;
			const name = `${logId}.log`;
			const description = `Apex debug log ${logId}`;
			newResource(uri, name, description, 'text/plain', apexLog, {
				audience: ['user']
			});
			if (client.supportsCapability('resource_links')) {
				content.push({
					type: 'resource_link',
					uri,
					name,
					mimeType: 'text/plain',
					description
				});
			}

			return {
				content,
				structuredContent: {apexLog}
			};

			/*
		} else if (action === 'analyze') {
			// Analyze action temporarily disabled (feature not ready)
			return {
				isError: true,
				content: [{type: 'text', text: 'Analyze action is temporarily disabled.'}]
			};
			*/
		}
	} catch (error) {
		logger.error(error);
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `❌ Error managing debug logs: ${error.message}`
				}
			]
		};
	}
}
