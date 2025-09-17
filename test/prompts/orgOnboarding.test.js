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
        "Collects essential information about a Salesforce org to provide effective support and onboarding guidance"
      );
    });

    it("should have required parameters", () => {
      const argsSchema = orgOnboardingPromptDefinition.argsSchema;
      expect(argsSchema.companyName).toBeDefined();
      expect(argsSchema.orgType).toBeDefined();
      expect(argsSchema.orgSize).toBeDefined();
      expect(argsSchema.supportContext).toBeDefined();
    });

    it("should have optional parameters", () => {
      const argsSchema = orgOnboardingPromptDefinition.argsSchema;
      expect(argsSchema.industry).toBeDefined();
      expect(argsSchema.accountRecords).toBeDefined();
      expect(argsSchema.opportunityRecords).toBeDefined();
      expect(argsSchema.contactRecords).toBeDefined();
      expect(argsSchema.customObjects).toBeDefined();
      expect(argsSchema.integrations).toBeDefined();
      expect(argsSchema.currentChallenges).toBeDefined();
    });
  });

  describe("orgOnboardingPromptHandler", () => {
    const minimalParams = {
      companyName: "Test Company",
      orgType: "Production",
      orgSize: "Medium (51-200 users)",
      supportContext: "Implementation support"
    };

    it("should return messages with correct structure", () => {
      const result = orgOnboardingPromptHandler(minimalParams);

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBe(2);

      // Check user message
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
      expect(result.messages[0].content.text).toContain("Test Company");
      expect(result.messages[0].content.text).toContain("Production");

      // Check assistant message
      expect(result.messages[1].role).toBe("assistant");
      expect(result.messages[1].content.type).toBe("text");
      expect(result.messages[1].content.text).toContain("Test Company");
    });

    it("should include comprehensive support content", () => {
      const result = orgOnboardingPromptHandler(minimalParams);
      const assistantMessage = result.messages[1].content.text;

      expect(assistantMessage).toContain("Org Assessment Strategy");
      expect(assistantMessage).toContain("Initial Org Discovery");
      expect(assistantMessage).toContain("Data Structure Analysis");
      expect(assistantMessage).toContain("Business Process Understanding");
      expect(assistantMessage).toContain("Technical Assessment");
      expect(assistantMessage).toContain("Recommended Support Actions");
    });

    it("should include data volume information when provided", () => {
      const paramsWithData = {
        ...minimalParams,
        accountRecords: "5,000",
        opportunityRecords: "2,500",
        contactRecords: "10,000"
      };

      const result = orgOnboardingPromptHandler(paramsWithData);
      const userMessage = result.messages[0].content.text;

      expect(userMessage).toContain("Accounts: 5,000");
      expect(userMessage).toContain("Opportunities: 2,500");
      expect(userMessage).toContain("Contacts: 10,000");
    });

    it("should include customizations when provided", () => {
      const paramsWithCustomizations = {
        ...minimalParams,
        customObjects: "Custom Project Management objects",
        integrations: "ERP system integration"
      };

      const result = orgOnboardingPromptHandler(paramsWithCustomizations);
      const userMessage = result.messages[0].content.text;

      expect(userMessage).toContain("Custom Objects/Processes: Custom Project Management objects");
      expect(userMessage).toContain("External Integrations: ERP system integration");
    });

    it("should include challenges when provided", () => {
      const paramsWithChallenges = {
        ...minimalParams,
        currentChallenges: "Users struggling with data entry processes"
      };

      const result = orgOnboardingPromptHandler(paramsWithChallenges);
      const userMessage = result.messages[0].content.text;

      expect(userMessage).toContain("Current Challenges:");
      expect(userMessage).toContain("Users struggling with data entry processes");
    });

    it("should include industry context when provided", () => {
      const paramsWithIndustry = {
        ...minimalParams,
        industry: "Healthcare"
      };

      const result = orgOnboardingPromptHandler(paramsWithIndustry);
      const userMessage = result.messages[0].content.text;

      expect(userMessage).toContain("Healthcare industry");
    });

    it("should handle all optional parameters", () => {
      const fullParams = {
        companyName: "Full Test Company",
        orgType: "Sandbox",
        industry: "Technology",
        orgSize: "Large (201-1000 users)",
        accountRecords: "15,000",
        opportunityRecords: "8,000",
        contactRecords: "25,000",
        customObjects: "Custom CRM objects for project tracking",
        integrations: "Multiple API integrations with external systems",
        currentChallenges: "Performance issues and user adoption problems",
        supportContext: "Troubleshooting and optimization"
      };

      const result = orgOnboardingPromptHandler(fullParams);
      const userMessage = result.messages[0].content.text;
      const assistantMessage = result.messages[1].content.text;

      // Check all parameters are included
      expect(userMessage).toContain("Full Test Company");
      expect(userMessage).toContain("Sandbox");
      expect(userMessage).toContain("Technology industry");
      expect(userMessage).toContain("Large (201-1000 users)");
      expect(userMessage).toContain("Accounts: 15,000");
      expect(userMessage).toContain("Opportunities: 8,000");
      expect(userMessage).toContain("Contacts: 25,000");
      expect(userMessage).toContain("Custom Objects/Processes: Custom CRM objects for project tracking");
      expect(userMessage).toContain("External Integrations: Multiple API integrations with external systems");
      expect(userMessage).toContain("Current Challenges:");
      expect(userMessage).toContain("Performance issues and user adoption problems");

      // Check assistant message includes company name
      expect(assistantMessage).toContain("Full Test Company");
    });
  });
});
