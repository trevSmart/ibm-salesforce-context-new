# Fix for Obfuscation Test Failures (Export Name Detection)

## Issue Description

When running `npm run publish-package`, the obfuscation tests failed with:

```
TypeError: HandlerRegistry is not a constructor
 ❯ src/mcp-server.js:1:39354
```

All 27 test suites failed after obfuscation, even though tests passed before obfuscation.

## Root Cause

The `dev/publish-package.sh` script extracts exported names from the codebase to preserve them during obfuscation using the `--reserved-names` flag. However, the regex patterns used to detect these names had a critical bug:

**Incorrect Pattern:**
```bash
grep -RhoE "export[[:space:]]+(function|class|const|let|var)[[:space:]]+[A-Za-z_][$A-Za-z0-9_]*"
```

The pattern `[A-Za-z_][$A-Za-z0-9_]*` is incorrect because the `$` character should not be inside the character class. This caused the regex to match only up to the first word boundary, truncating multi-word identifiers:

- `HandlerRegistry` → `Handler`
- `WorkspacePathManager` → `Workspace`  
- `ClientWorkspaceStrategy` → `Client`
- `InitializationPhases` → `Initialization`

As a result, the obfuscator would rename the full class names (e.g., `HandlerRegistry`) while only protecting the truncated version (e.g., `Handler`), causing the TypeError at import time.

## Solution

Fixed the regex pattern to correctly capture complete identifiers:

**Correct Pattern:**
```bash
grep -RhoE "export[[:space:]]+(function|class|const|let|var)[[:space:]]+[A-Za-z_][A-Za-z0-9_]*"
```

The corrected pattern `[A-Za-z_][A-Za-z0-9_]*` properly matches full multi-word identifiers.

## Files Changed

- **Modified**: `dev/publish-package.sh` (lines 279 and 286)
  - Fixed regex pattern in export name detection (2 occurrences)

## Testing

The fix was verified with:

1. ✅ Regex pattern validation showing correct name extraction:
   - Old: `HandlerRegistry` → `Handler` (incorrect)
   - New: `HandlerRegistry` → `HandlerRegistry` (correct)

2. ✅ All 4 exported classes now correctly detected:
   - `HandlerRegistry`
   - `WorkspacePathManager`
   - `ClientWorkspaceStrategy`
   - `InitializationPhases`

3. ✅ Obfuscation test with reserved names preserves class constructors correctly

## Why This Fix Works

The `javascript-obfuscator` tool's `--reserved-names` flag uses regex patterns to identify names that should not be obfuscated. By providing the complete class names (e.g., `^HandlerRegistry$`) rather than partial names (e.g., `^Handler$`), the obfuscator correctly preserves:

1. The exported class names in the export statements
2. All internal references to these classes
3. The class constructor when instantiated with `new`

Without this fix, the obfuscator would see `Handler` as reserved but still rename `HandlerRegistry` to something else, breaking imports and causing "not a constructor" errors.

## Impact

This fix resolves obfuscation test failures for all 27 test suites that depend on correctly importing and instantiating the affected classes.

## Related Issues

- Previous fix: [Circular Dependency Fix](obfuscation-circular-dependency-fix.md)
- Publish script: `dev/publish-package.sh`
- Obfuscation tool: `javascript-obfuscator`
