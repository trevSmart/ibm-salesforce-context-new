# 🌿 Branch Protection Rules

This document outlines the recommended branch protection rules to work with the automated code review system.

## 🛡️ Main Branch Protection

### Required Status Checks
Enable the following status checks as required before merging:

- **lint-and-test** - Biome and test execution
- **security** - Security audit and dependency checks
- **code-quality** - Code quality analysis
- **CodeQL** - Security code scanning

### Branch Protection Settings

1. **Require a pull request before merging**
   - ✅ Enable
   - ✅ Require approvals: 1
   - ✅ Dismiss stale PR approvals when new commits are pushed

2. **Require status checks to pass before merging**
   - ✅ Enable
   - ✅ Require branches to be up to date before merging
   - ✅ Status checks that are required:
     - `lint-and-test`
     - `security`
     - `code-quality`
     - `CodeQL`

3. **Require conversation resolution before merging**
   - ✅ Enable

4. **Require signed commits**
   - ✅ Enable (recommended for security)

5. **Require linear history**
   - ✅ Enable (prevents merge commits)

6. **Include administrators**
   - ✅ Enable (ensures all users follow the rules)

## 🔄 Development Branch Protection

For `develop` branch, consider enabling:

- **Require a pull request before merging**
- **Require status checks to pass before merging**
- **Require conversation resolution before merging**

## 📋 Implementation Steps

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit existing rules
4. Configure the protection rules as outlined above
5. Save changes

## 🚨 Important Notes

- **Status checks must be enabled** for the automated workflows to work properly
- **Branch protection rules** ensure code quality standards are maintained
- **Required reviewers** can be added based on your team structure
- **Automated workflows** will provide feedback on PRs automatically

## 🔧 Customization

You can customize these rules based on your team's needs:

- Adjust the number of required approvals
- Add specific reviewers for certain file types
- Modify status check requirements
- Add custom protection rules for specific patterns

## 📚 Related Documentation

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks)
- [GitHub Actions](https://docs.github.com/en/actions)
