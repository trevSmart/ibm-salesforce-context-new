/**
 * @fileoverview Tests for orgOnboarding prompt
 */

import { describe, it, expect } from "vitest";
import { orgOnboardingPromptDefinition, orgOnboardingPromptHandler } from "../../src/prompts/orgOnboarding.js";

describe("orgOnboarding prompt", () => {
  describe("orgOnboardingPromptDefinition", () => {
    it("should have correct title", () => {
      expect(orgOnboardingPromptDefinition.title).toBe("Org Discovery & Onboarding Support");
    });

    it("should have correct description", () => {
      expect(orgOnboardingPromptDefinition.description).toBe(
        "Automatically discovers essential information about a Salesforce org to provide effective support and onboarding guidance"
      );
    });

    it("should not have argsSchema", () => {
      expect(orgOnboardingPromptDefinition.argsSchema).toBeUndefined();
    });
  });

  describe("orgOnboardingPromptHandler", () => {
    it("should return messages with correct structure", () => {
      const result = orgOnboardingPromptHandler();

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBe(1);

      // Check user message
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
      expect(result.messages[0].content.text).toContain("comprehensive support and guidance");
    });

    it("should include comprehensive discovery content", () => {
      const result = orgOnboardingPromptHandler();
      const assistantMessage = result.messages[1].content.text;

      expect(assistantMessage).toContain("Org Discovery Strategy");
      expect(assistantMessage).toContain("Initial Org Assessment");
      expect(assistantMessage).toContain("Data Volume Analysis");
      expect(assistantMessage).toContain("Custom Objects Discovery");
      expect(assistantMessage).toContain("Business Process Analysis");
      expect(assistantMessage).toContain("Integration Assessment");
      expect(assistantMessage).toContain("User and Security Analysis");
      expect(assistantMessage).toContain("Recommended Discovery Actions");
    });

    it("should include specific tool recommendations", () => {
      const result = orgOnboardingPromptHandler();
      const assistantMessage = result.messages[1].content.text;

      expect(assistantMessage).toContain("salesforceContextUtils");
      expect(assistantMessage).toContain("describeObject");
      expect(assistantMessage).toContain("getRecentlyViewedRecords");
      expect(assistantMessage).toContain("SELECT COUNT() FROM Account");
      expect(assistantMessage).toContain("SELECT COUNT() FROM Opportunity");
      expect(assistantMessage).toContain("SELECT COUNT() FROM Contact");
    });

    it("should include discovery process guidance", () => {
      const result = orgOnboardingPromptHandler();
      const assistantMessage = result.messages[1].content.text;

      expect(assistantMessage).toContain("Immediate Steps:");
      expect(assistantMessage).toContain("Deep Dive Analysis:");
      expect(assistantMessage).toContain("## Support Focus Areas");
      expect(assistantMessage).toContain("Let me start by getting the basic org information");
    });

    it("should not require any parameters", () => {
      // This test ensures the handler can be called without any parameters
      expect(() => orgOnboardingPromptHandler()).not.toThrow();

      const result = orgOnboardingPromptHandler();
      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
    });
  });
});
