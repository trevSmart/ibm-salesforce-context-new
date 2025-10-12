# Security Policy

## Known Vulnerabilities

This project has known vulnerabilities in transitive dependencies that cannot be resolved at the project level:

### Salesforce CLI Dependencies

The following vulnerabilities are present in `@salesforce/cli` transitive dependencies:

1. **brace-expansion** (GHSA-v6h2-p8h4-qcjw)
   - **Severity**: Low
   - **Type**: Regular Expression Denial of Service (ReDoS)
   - **Location**: Multiple nested dependencies within `@salesforce/cli`
   - **Affected Versions**: 1.0.0 - 1.1.11, 2.0.0 - 2.0.1, 4.0.0
   - **Status**: Partially mitigated via npm overrides where possible; bundled dependencies in @salesforce/cli cannot be overridden

2. **path-to-regexp** (GHSA-9wv6-86v2-598j)
   - **Severity**: High
   - **Type**: Backtracking regular expressions (CWE-1333)
   - **Location**: `@salesforce/cli` and `@salesforce/cli-plugins-testkit`
   - **Affected Versions**: 0.2.0 - 1.8.0, 4.0.0 - 6.2.2
   - **CVSS Score**: 7.5 (High)
   - **Status**: Cannot be fixed - requires Salesforce CLI update; project uses safe v8.3.0 for direct dependencies

3. **tar-fs** (GHSA-vj76-c3g6-qr5v)
   - **Severity**: High
   - **Type**: Symlink validation bypass vulnerability
   - **Location**: `@salesforce/cli` bundled dependencies
   - **Affected Versions**: 2.0.0 - 2.1.3
   - **CVSS Score**: 7.5 (High)
   - **Status**: Cannot be fixed - requires Salesforce CLI update

4. **fast-redact** (GHSA-ffrw-9mx8-89p8)
   - **Severity**: Low
   - **Type**: Prototype pollution (CWE-1321)
   - **Location**: `@salesforce/cli` via `pino` logger
   - **Affected Versions**: ≤3.5.0 (all current versions)
   - **CVSS Score**: 0.0 (Low)
   - **Status**: Cannot be fixed - no patched version available; waiting for upstream fix

### Risk Assessment

- **Impact**: Low to Moderate
  - All vulnerabilities are in development/testing dependencies only (@salesforce/cli is devDependency)
  - The MCP server does not expose these libraries to external users
  - High-severity vulnerabilities (path-to-regexp, tar-fs) require specific attack conditions unlikely in development context
  - Low-severity vulnerabilities (brace-expansion, fast-redact) have minimal practical impact
- **Exposure**: None
  - These vulnerabilities exist in the Salesforce CLI tool used only for testing
  - The production MCP server does not include or use @salesforce/cli
  - End users installing the MCP server are not affected
- **Mitigation**: 
  - Regular monitoring and updating of `@salesforce/cli` when fixes become available
  - npm overrides applied for brace-expansion where technically possible
  - Direct dependencies use safe versions (e.g., path-to-regexp@8.3.0)
  - CI/CD security checks configured to acknowledge known external dependencies

### Monitoring

- Dependabot is configured to monitor for updates to `@salesforce/cli`
- Security audits are run in CI/CD with appropriate thresholds
- This document is updated when new vulnerabilities are discovered
- npm overrides configured in package.json to force safe versions where possible (brace-expansion)

### Technical Details

**Why npm overrides don't fully resolve these vulnerabilities:**
- `@salesforce/cli` bundles its own dependencies in a nested `node_modules` structure
- npm overrides can only affect hoisted dependencies in the root `node_modules`
- Bundled dependencies within packages cannot be overridden without modifying the package itself
- This is a known limitation of npm's dependency resolution system

**Current mitigation status:**
- ✅ brace-expansion: Partially mitigated via npm overrides (hoisted instances only)
- ❌ path-to-regexp: Cannot override bundled v1.8.0 and v6.2.2 in @salesforce/cli
- ❌ tar-fs: Cannot override bundled v2.1.3 in @salesforce/cli
- ❌ fast-redact: No patched version available yet

### Reporting Security Issues

To report security vulnerabilities, please use GitHub's private vulnerability reporting feature.

## Dependabot Configuration

Dependabot is configured to:
- Ignore major version updates for critical dependencies
- Group related dependency updates
- Monitor for security updates daily
- Create pull requests for dependency updates

See `.github/dependabot.yml` for full configuration details.