# GitHub Branch Protection Setup

To complete the forbidden literal protection setup, you need to configure branch protection rules in your GitHub repository settings.

## Required Branch Protection Rules

### 1. Navigate to Branch Protection Settings
1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar
4. Click **Add rule** or edit existing rules for `main`, `master`, and `develop` branches

### 2. Configure Protection Rules

For each protected branch (`main`, `master`, `develop`), enable the following settings:

#### ✅ **Require status checks to pass before merging**
- **Required status checks:**
  - `forbidden-literal-check` (from push-checks.yml)
  - `lint` (from push-checks.yml)
  - `test` (from push-checks.yml)
  - `security` (from push-checks.yml)

#### ✅ **Require branches to be up to date before merging**
- This ensures the latest changes are included in status checks

#### ✅ **Require pull request reviews before merging**
- **Required number of reviewers:** 1 (or more as needed)
- **Dismiss stale reviews when new commits are pushed:** ✅
- **Require review from code owners:** ✅ (if you have CODEOWNERS file)

#### ✅ **Restrict pushes that create files**
- This prevents direct pushes to protected branches

#### ✅ **Require linear history**
- Prevents merge commits and ensures clean history

### 3. Additional Recommended Settings

#### ✅ **Include administrators**
- Ensures even repository admins follow the same rules

#### ✅ **Allow force pushes**
- **Disable** this to prevent history rewriting

#### ✅ **Allow deletions**
- **Disable** this to prevent accidental branch deletion

## Workflow Status Checks

The following status checks will be required to pass before merging:

1. **`forbidden-literal-check`** - Ensures no forbidden literals are present
2. **`lint`** - Runs code linting and formatting
3. **`test`** - Runs the full test suite
4. **`security`** - Runs security audit and dependency checks

## Testing the Setup

After configuring branch protection:

1. **Create a test branch** with forbidden content:
   ```bash
   git checkout -b test-forbidden-content
   echo "test forbidden content" > test-file.txt
   git add test-file.txt
   git commit -m "Test forbidden literal"
   git push origin test-forbidden-content
   ```

2. **Create a pull request** targeting the protected branch

3. **Verify the checks fail** - The `forbidden-literal-check` should fail and block the merge

4. **Fix the content** and push again - The checks should pass

5. **Clean up** the test branch after verification

## Benefits

With this setup, you now have **multi-layered protection**:

- **Local level**: Pre-commit hooks catch issues during development
- **Remote level**: GitHub Actions catch issues in pull requests
- **Branch level**: Branch protection rules prevent merging without passing checks

This ensures that forbidden content cannot accidentally make it into your main codebase, even if someone bypasses the local pre-commit hook or pushes directly to a protected branch.
