/**
 * @fileoverview Tests for orgOnboarding prompt
 */

import {describe, expect, it} from 'vitest';
import {orgOnboardingPromptDefinition, orgOnboardingPromptHandler} from '../../src/prompts/orgOnboarding.js';

describe('orgOnboarding prompt', () => {
	describe('orgOnboardingPromptDefinition', () => {
		it('should have correct title', () => {
			expect(orgOnboardingPromptDefinition.title).toBe('Org Discovery & Onboarding Support');
		});

		it('should have correct description', () => {
			expect(orgOnboardingPromptDefinition.description).toBe(
				'Automatically discovers essential information about a Salesforce org to provide effective support and onboarding guidance',
			);
		});

		it('should not have argsSchema', () => {
			expect(orgOnboardingPromptDefinition.argsSchema).toBeUndefined();
		});
	});

	describe('orgOnboardingPromptHandler', () => {
		const getUserMessage = () => {
			const result = orgOnboardingPromptHandler();
			const [userMessage] = result.messages;
			return {result, userMessage};
		};

		it('should return a single user message with the onboarding instructions', () => {
			const {result, userMessage} = getUserMessage();
			expect(result).toBeDefined();
			expect(Array.isArray(result.messages)).toBe(true);
			expect(result.messages).toHaveLength(1);
			expect(userMessage.role).toBe('user');
			expect(userMessage.content.type).toBe('text');
			expect(userMessage.content.text).toContain('comprehensive support and guidance');
		});

		it('should outline the mandatory discovery steps', () => {
			const {userMessage} = getUserMessage();
			const {text} = userMessage.content;
			expect(text).toContain('STRICTLY FOLLOW THE FOLLOWING INSTRUCTIONS');
			expect(text).toContain('Call the salesforceContextUtils tool');
			expect(text).toContain('Execute exactly once the following Anonymous Apex script');
			expect(text).toContain('executeSoqlQuery tool');
			expect(text).toContain('CustomObject WHERE NamespacePrefix = NULL');
			expect(text).toContain('LightningComponentBundle WHERE NamespacePrefix = NULL');
		});

		it('should describe the required analysis output format', () => {
			const {userMessage} = getUserMessage();
			const {text} = userMessage.content;
			expect(text).toContain('# Analysis');
			expect(text).toContain('## Company name sandbox/production org overview');
			expect(text).toContain('Initial Org Assessment');
			expect(text).toContain('Custom Objects Discovery');
			expect(text).toContain('Business Process Analysis');
			expect(text).toContain('Integration Assessment');
			expect(text).toContain('User hierarchy and security analysis');
		});

		it('should not require any parameters', () => {
			expect(() => orgOnboardingPromptHandler()).not.toThrow();
			const {result} = getUserMessage();
			expect(result.messages).toBeDefined();
		});
	});
});
