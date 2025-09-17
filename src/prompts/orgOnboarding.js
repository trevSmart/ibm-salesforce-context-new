/**
 * @fileoverview Prompt for Salesforce org discovery and onboarding support
 */

import { z } from 'zod';

/**
 * Prompt definition for Salesforce org discovery and onboarding support
 */
export const orgOnboardingPromptDefinition = {
  title: "Org Discovery & Onboarding Support",
  description: "Collects essential information about a Salesforce org to provide effective support and onboarding guidance",
  argsSchema: {
    companyName: z.string().describe('Name of the company that owns this Salesforce org'),
    orgType: z.enum(['Production', 'Sandbox', 'Developer', 'Partial Copy', 'Full Copy']).describe('Type of Salesforce org'),
    industry: z.string().optional().describe('Industry or business sector of the company'),
    orgSize: z.enum(['Small (1-50 users)', 'Medium (51-200 users)', 'Large (201-1000 users)', 'Enterprise (1000+ users)']).describe('Approximate size of the organization'),
    accountRecords: z.string().optional().describe('Approximate number of Account records in the org'),
    opportunityRecords: z.string().optional().describe('Approximate number of Opportunity records in the org'),
    contactRecords: z.string().optional().describe('Approximate number of Contact records in the org'),
    customObjects: z.string().optional().describe('Any custom objects or specific business processes unique to this org'),
    integrations: z.string().optional().describe('External systems or integrations connected to this org'),
    currentChallenges: z.string().optional().describe('Current challenges or pain points the organization is facing'),
    supportContext: z.string().describe('Context of why support is needed (implementation, troubleshooting, optimization, etc.)')
  }
};

/**
 * Prompt handler for Salesforce org discovery and onboarding support
 * This prompt helps support teams understand a new Salesforce org and provide effective guidance
 */
export function orgOnboardingPromptHandler({
  companyName,
  orgType,
  industry,
  orgSize,
  accountRecords,
  opportunityRecords,
  contactRecords,
  customObjects,
  integrations,
  currentChallenges,
  supportContext
}) {
  // Build context-specific guidance based on provided information
  let orgContext = `I'm providing support for ${companyName}'s ${orgType} Salesforce org`;

  if (industry) {
    orgContext += ` in the ${industry} industry`;
  }

  if (orgSize) {
    orgContext += ` (${orgSize})`;
  }

  // Create data volume context
  let dataContext = '';
  if (accountRecords || opportunityRecords || contactRecords) {
    dataContext = '\n\n**Data Volume Overview:**\n';
    if (accountRecords) dataContext += `- Accounts: ${accountRecords}\n`;
    if (opportunityRecords) dataContext += `- Opportunities: ${opportunityRecords}\n`;
    if (contactRecords) dataContext += `- Contacts: ${contactRecords}\n`;
  }

  // Create customizations context
  let customizationsContext = '';
  if (customObjects || integrations) {
    customizationsContext = '\n\n**Customizations & Integrations:**\n';
    if (customObjects) customizationsContext += `- Custom Objects/Processes: ${customObjects}\n`;
    if (integrations) customizationsContext += `- External Integrations: ${integrations}\n`;
  }

  // Create challenges context
  let challengesContext = '';
  if (currentChallenges) {
    challengesContext = `\n\n**Current Challenges:**\n${currentChallenges}`;
  }

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `${orgContext}. ${supportContext}.${dataContext}${customizationsContext}${challengesContext}\n\nI need comprehensive support and guidance to understand this org and provide effective assistance.`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `I'll help you understand and support ${companyName}'s Salesforce org effectively! Based on the information provided, here's a comprehensive support approach:\n\n## Org Assessment Strategy\n\n### 1. **Initial Org Discovery**\n- Connect to the org and verify user permissions\n- Review org configuration and release version\n- Check data storage usage and limits\n- Examine user profiles and permission sets\n\n### 2. **Data Structure Analysis**\n- Analyze the data model and relationships${accountRecords ? `\n- Review Account structure (${accountRecords} records)` : ''}${opportunityRecords ? `\n- Examine Opportunity processes (${opportunityRecords} records)` : ''}${contactRecords ? `\n- Understand Contact management (${contactRecords} records)` : ''}\n- Identify custom objects and their purposes\n- Review field usage and data quality\n\n### 3. **Business Process Understanding**\n- Map out key business processes\n- Identify automation and workflows\n- Review validation rules and business logic\n- Understand reporting and dashboard usage\n\n### 4. **Technical Assessment**\n- Check integrations and data flows\n- Review custom development (Apex, Lightning components)\n- Assess security and sharing model\n- Examine data backup and recovery processes\n\n## Recommended Support Actions\n\n### Immediate Steps:\n1. **Use available tools to explore the org schema**\n2. **Query sample data to understand data patterns**\n3. **Review recent records and user activities**\n4. **Check org configuration and customizations**\n\n### Deep Dive Analysis:\n- Run SOQL queries to understand data distribution\n- Examine object relationships and dependencies\n- Review automation and workflow configurations\n- Assess user adoption and training needs\n\n## Support Focus Areas\n\nBased on the ${orgType} environment and ${orgSize} organization:\n- **Data Management**: Ensure data quality and governance\n- **User Training**: Provide role-specific guidance\n- **Process Optimization**: Identify improvement opportunities\n- **Integration Support**: Maintain external system connections\n- **Performance Monitoring**: Track org health and usage\n\nWould you like me to help you explore any specific aspect of this org using the available Salesforce tools?`
        }
      }
    ]
  };
}
