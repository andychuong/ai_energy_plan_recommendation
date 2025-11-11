#!/bin/bash
# Script to populate energy plans by invoking the updatePlanCatalog Lambda function

echo "🚀 Populating energy plans..."
echo ""

# Find the Lambda function name
FUNCTION_NAME=$(aws lambda list-functions --region us-east-1 \
  --query "Functions[?contains(FunctionName, 'updateplancatalog') || contains(FunctionName, 'update-plan-catalog') || contains(FunctionName, 'updatePlanCatalog')].FunctionName" \
  --output text 2>/dev/null | head -1)

if [ -z "$FUNCTION_NAME" ]; then
  echo "❌ Could not find update-plan-catalog Lambda function"
  echo "   Make sure the sandbox is deployed and AWS credentials are configured"
  echo ""
  echo "   Available functions:"
  aws lambda list-functions --region us-east-1 \
    --query "Functions[?contains(FunctionName, 'sparksave') || contains(FunctionName, 'update')].FunctionName" \
    --output text 2>/dev/null | tr '\t' '\n' | head -5
  exit 1
fi

echo "📋 Found function: $FUNCTION_NAME"
echo ""

# Invoke the function with states to populate
PAYLOAD='{"sources": ["eia", "openei"], "states": ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "GA"]}'

echo "📤 Invoking function to populate plans for: CA, TX, NY, FL, IL, PA, OH, GA"
echo ""

RESULT=$(aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --region us-east-1 \
  --payload "$PAYLOAD" \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-response.json 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ Function invoked successfully!"
  echo ""
  echo "📊 Response:"
  cat /tmp/lambda-response.json | jq '.' 2>/dev/null || cat /tmp/lambda-response.json
  echo ""
  
  # Check if plans were updated
  PLANS_UPDATED=$(cat /tmp/lambda-response.json | jq -r '.plansUpdated // 0' 2>/dev/null)
  if [ "$PLANS_UPDATED" != "null" ] && [ "$PLANS_UPDATED" != "0" ]; then
    echo "🎉 Successfully populated $PLANS_UPDATED energy plans!"
  else
    echo "⚠️  Function executed but may not have updated plans. Check the response above."
  fi
else
  echo "❌ Failed to invoke function:"
  echo "$RESULT"
  exit 1
fi

