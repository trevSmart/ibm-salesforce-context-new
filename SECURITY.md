# Security Policy

## Known Vulnerabilities

This project has known vulnerabilities in transitive dependencies that cannot be resolved at the project level:

### Salesforce CLI Dependencies

The following vulnerabilities are present in `@salesforce/cli` transitive dependencies:

1. **brace-expansion** (GHSA-v6h2-p8h4-qcjw)
   - **Severity**: Low
   - **Type**: Regular Expression Denial of Service (ReDoS)
   - **Location**: Multiple nested dependencies within `@salesforce/cli`
   - **Status**: Cannot be fixed - requires Salesforce CLI update

2. **path-to-regexp** (GHSA-9wv6-86v2-598j)
   - **Severity**: High
   - **Type**: Backtracking regular expressions
   - **Location**: `@salesforce/cli` and `@salesforce/cli-plugins-testkit`
   - **Status**: Cannot be fixed - requires Salesforce CLI update

### Risk Assessment

- **Impact**: Low - These vulnerabilities are in development dependencies only
- **Exposure**: None - The MCP server does not expose these libraries to external users
- **Mitigation**: Regular monitoring and updating of `@salesforce/cli` when fixes become available

### Monitoring

- Dependabot is configured to monitor for updates to `@salesforce/cli`
- Security audits are run in CI/CD with appropriate thresholds
- This document is updated when new vulnerabilities are discovered

### Reporting Security Issues

To report security vulnerabilities, please use GitHub's private vulnerability reporting feature.

## Dependabot Configuration

Dependabot is configured to:
- Ignore major version updates for critical dependencies
- Group related dependency updates
- Monitor for security updates daily
- Create pull requests for dependency updates

See `.github/dependabot.yml` for full configuration details.