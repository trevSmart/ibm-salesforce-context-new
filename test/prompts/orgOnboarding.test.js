/**
 * @fileoverview Tests for orgOnboarding prompt
 */

import {describe, expect, it} from 'vitest';
import {orgOnboardingPromptDefinition, orgOnboardingPromptHandler} from '../../src/prompts/orgOnboarding.js';
import { logTestResult } from '../testUtils.js';

describe('orgOnboarding prompt', () => {
	describe('orgOnboardingPromptDefinition', () => {
		it('should have correct title', () => {
			logTestResult('orgOnboarding.test.js', 'Correct title', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt has correct title'
			})
			expect(orgOnboardingPromptDefinition.title).toBe('Org Discovery & Onboarding Support');
		});

		it('should have correct description', () => {
			logTestResult('orgOnboarding.test.js', 'Correct description', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt has correct description'
			})
			expect(orgOnboardingPromptDefinition.description).toBe(
				'Automatically discovers essential information about a Salesforce org to provide effective support and onboarding guidance',
			);
		});

		it('should not have argsSchema', () => {
			logTestResult('orgOnboarding.test.js', 'No argsSchema', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt does not have argsSchema'
			})
			expect(orgOnboardingPromptDefinition.argsSchema).toBeUndefined();
		});
	});

	describe('orgOnboardingPromptHandler', () => {
		const getUserMessage = async () => {
			const result = await orgOnboardingPromptHandler();
			const [userMessage] = result.messages;
			return {result, userMessage};
		};

		it('should return a single user message with the onboarding instructions', async () => {
			const {result, userMessage} = await getUserMessage();

			logTestResult('orgOnboarding.test.js', 'Single user message', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt handler returns single user message with onboarding instructions'
			})

			expect(result).toBeDefined();
			expect(Array.isArray(result.messages)).toBe(true);
			expect(result.messages).toHaveLength(1);
			expect(userMessage.role).toBe('user');
			expect(userMessage.content.type).toBe('text');
			expect(userMessage.content.text).toContain('comprehensive support and guidance');
		});

		it('should outline the mandatory discovery steps', async () => {
			const {userMessage} = await getUserMessage();
			const {text} = userMessage.content;

			logTestResult('orgOnboarding.test.js', 'Mandatory discovery steps', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt outlines mandatory discovery steps'
			})

			expect(text).toContain('STRICTLY FOLLOW THE FOLLOWING INSTRUCTIONS');
			expect(text).toContain('Call the salesforceContextUtils tool');
			expect(text).toContain('Execute exactly once the following Anonymous Apex script');
			expect(text).toContain('executeSoqlQuery tool');
			expect(text).toContain('CustomObject WHERE NamespacePrefix = NULL');
			expect(text).toContain('LightningComponentBundle WHERE NamespacePrefix = NULL');
		});

		it('should describe the required analysis output format', async () => {
			const {userMessage} = await getUserMessage();
			const {text} = userMessage.content;

			logTestResult('orgOnboarding.test.js', 'Analysis output format', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt describes required analysis output format'
			})

			expect(text).toContain('# Analysis');
			expect(text).toContain('## Company name sandbox/production org overview');
			expect(text).toContain('Initial Org Assessment');
			expect(text).toContain('Custom Objects Discovery');
			expect(text).toContain('Business Process Analysis');
			expect(text).toContain('Integration Assessment');
			expect(text).toContain('User hierarchy and security analysis');
		});

		it('should not require any parameters', async () => {
			logTestResult('orgOnboarding.test.js', 'No parameters required', {}, 'ok', {
				description: 'Tests that orgOnboarding prompt handler does not require any parameters'
			})

			// Test that the async function can be called without parameters
			await expect(orgOnboardingPromptHandler()).resolves.toBeDefined();
			const {result} = await getUserMessage();
			expect(result.messages).toBeDefined();
		});
	});
});
