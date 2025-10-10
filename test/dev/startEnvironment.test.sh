#!/bin/bash
# Test script for dev/startEnvironment.sh
# This validates that the Salesforce org login functionality works correctly

set -e

echo "=== Testing startEnvironment.sh ==="
echo ""

# Check if SF credentials are available
if [ -z "$SF_ORG_CLIENT_ID" ] || [ -z "$SF_ORG_CLIENT_SECRET" ] || \
   [ -z "$SF_ORG_CLIENT_USERNAME" ] || [ -z "$SF_ORG_CLIENT_PASSWORD" ]; then
  echo "❌ SKIPPED: SF credentials not available in environment"
  echo "   Required: SF_ORG_CLIENT_ID, SF_ORG_CLIENT_SECRET, SF_ORG_CLIENT_USERNAME, SF_ORG_CLIENT_PASSWORD"
  exit 0
fi

# Source the startEnvironment.sh script
echo "📝 Running startEnvironment.sh..."
source dev/startEnvironment.sh

echo ""
echo "=== Validation Tests ==="
echo ""

# Test 1: Check if SF_AUTH_SUCCESS is set to true
if [ "$SF_AUTH_SUCCESS" = "true" ]; then
  echo "✅ Test 1 PASSED: SF_AUTH_SUCCESS is set to true"
else
  echo "❌ Test 1 FAILED: SF_AUTH_SUCCESS is not true (value: $SF_AUTH_SUCCESS)"
  exit 1
fi

# Test 2: Check if SF_ACCESS_TOKEN is set
if [ -n "$SF_ACCESS_TOKEN" ]; then
  echo "✅ Test 2 PASSED: SF_ACCESS_TOKEN is set (length: ${#SF_ACCESS_TOKEN}, value: REDACTED)"
else
  echo "❌ Test 2 FAILED: SF_ACCESS_TOKEN is not set"
  exit 1
fi

# Test 3: Check if SF_INSTANCE_URL is set
if [ -n "$SF_INSTANCE_URL" ]; then
  echo "✅ Test 3 PASSED: SF_INSTANCE_URL is set ($SF_INSTANCE_URL)"
else
  echo "❌ Test 3 FAILED: SF_INSTANCE_URL is not set"
  exit 1
fi

# Test 4: Check if SF CLI is logged in
if sf org display --json > /dev/null 2>&1; then
  echo "✅ Test 4 PASSED: SF CLI is logged in"
else
  echo "❌ Test 4 FAILED: SF CLI is not logged in"
  exit 1
fi

# Test 5: Verify we can query the org
if sf data query --query "SELECT Id FROM User LIMIT 1" --json > /dev/null 2>&1; then
  echo "✅ Test 5 PASSED: Can query Salesforce data"
else
  echo "❌ Test 5 FAILED: Cannot query Salesforce data"
  exit 1
fi

echo ""
echo "=== All Tests Passed! ==="
echo ""
