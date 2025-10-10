#!/bin/bash
set -e  # Exit on error

echo "Authenticating with Salesforce..."

# Get OAuth token from Salesforce
response=$(curl -s -X POST "https://test.salesforce.com/services/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$SF_ORG_CLIENT_ID" \
  -d "client_secret=$SF_ORG_CLIENT_SECRET" \
  -d "username=$SF_ORG_CLIENT_USERNAME" \
  -d "password=$SF_ORG_CLIENT_PASSWORD")

# Check if response contains an error
if echo "$response" | grep -q '"error"'; then
  echo "Error: OAuth authentication failed"
  echo "$response"
  export SF_AUTH_SUCCESS=false
  exit 1
fi

# Install jq if not available (optional, only if needed)
if ! command -v jq &> /dev/null; then
  echo "jq not found, attempting to install..."
  apt install -y jq || echo "Warning: Could not install jq, using grep instead"
fi

# Extract access token and instance URL
if command -v jq &> /dev/null; then
  export SF_ACCESS_TOKEN=$(echo "$response" | jq -r '.access_token')
  export SF_INSTANCE_URL=$(echo "$response" | jq -r '.instance_url')
else
  # Fallback to grep if jq is not available
  export SF_ACCESS_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  export SF_INSTANCE_URL=$(echo "$response" | grep -o '"instance_url":"[^"]*"' | cut -d'"' -f4)
fi

echo "Access Token obtained: ${SF_ACCESS_TOKEN:0:20}..."
echo "Instance URL: $SF_INSTANCE_URL"

# Set default alias if not provided
SF_ORG_ALIAS=${SF_ORG_ALIAS:-"copilot-env"}

# Login to Salesforce using the SF CLI
echo "Logging in to Salesforce org with alias '$SF_ORG_ALIAS'..."
sf org login access-token --instance-url "$SF_INSTANCE_URL" --no-prompt --alias "$SF_ORG_ALIAS" --set-default

# Verify the login
echo "Verifying Salesforce org connection..."
sf org display

# Mark authentication as successful
export SF_AUTH_SUCCESS=true
echo "Salesforce authentication successful!"
