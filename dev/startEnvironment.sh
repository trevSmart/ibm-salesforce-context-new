#!/bin/bash
response=$(curl -s -X POST "https://test.salesforce.com/services/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$SF_ORG_CLIENT_ID" \
  -d "client_secret=$SF_ORG_CLIENT_SECRET" \
  -d "username=$SF_ORG_CLIENT_USERNAME" \
  -d "password=$SF_ORG_CLIENT_PASSWORD")

apt install jq

echo "$response" | jq -r '.access_token'
echo "$response" | jq -r '.instance_url'

sf org login access-token --instance-url "$SF_INSTANCE_URL" --no-prompt --alias "$SF_ORG_ALIAS" --set-default

sf org display
