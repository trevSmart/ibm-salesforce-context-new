import {completable} from '@modelcontextprotocol/sdk/server/completable.js';
import {z} from 'zod';

export const codeModificationPromptDefinition = {
	title: 'Code modification',
	description: 'Code modification',
	argsSchema: {
		currentBehavior: z.string().describe('Current behavior of the code'),
		desiredBehavior: z.string().describe('Desired behavior of the code after the modification'),
		updateTests: completable(z.enum(['Yes', 'No']), (value) => ['Yes', 'No'].filter((d) => d.toLowerCase().startsWith(value.toLowerCase())))
	}
};

export function codeModificationPrompt({currentBehavior, desiredBehavior, updateTests}) {
	return {
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `We are modifying this code to change its behavior. The current behavior is the following:\n\n${currentBehavior}`
				}
			},
			{
				role: 'assistant',
				content: {
					type: 'text',
					text: 'Ok please explain the desired behavior that will replace the current behavior once we modify the code. Please explain it in a way that is easy to understand and that will be easy to implement.'
				}
			},
			{
				role: 'user',
				content: {
					type: 'text',
					text: `After we modify the code, the new behavior has to be the following:\n\n${desiredBehavior}`
				}
			},
			{
				role: 'assistant',
				content: {
					type: 'text',
					text: 'Ok I will modify the code to change achieve the desired behavior you have explained. Please provide the code that will be modified. When finished, should I update the related test classes?'
				}
			},
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Update tests: ${updateTests}`
				}
			}
		]
	};
}
