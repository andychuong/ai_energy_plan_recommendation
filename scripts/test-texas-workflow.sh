#!/bin/bash
# End-to-End Testing Script for Austin, Texas
# This script tests the complete workflow for a Texas user

set -e

echo "🧪 Starting End-to-End Testing for Austin, Texas"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if sandbox is running
echo "📋 Step 1: Checking if sandbox is deployed..."
if ! aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, 'updateplancatalog') || contains(FunctionName, 'update-plan-catalog')].FunctionName" --output text 2>/dev/null | grep -q "update"; then
  echo -e "${RED}❌ Sandbox does not appear to be deployed${NC}"
  echo "   Please run 'npm run sandbox' first"
  exit 1
fi
echo -e "${GREEN}✅ Sandbox is deployed${NC}"
echo ""

# Step 2: Populate Texas Plans
echo "📋 Step 2: Populating Texas energy plans..."
FUNCTION_NAME=$(aws lambda list-functions --region us-east-1 \
  --query "Functions[?contains(FunctionName, 'updateplancatalog') || contains(FunctionName, 'update-plan-catalog') || contains(FunctionName, 'updatePlanCatalog')].FunctionName" \
  --output text 2>/dev/null | head -1)

if [ -z "$FUNCTION_NAME" ]; then
  echo -e "${RED}❌ Could not find update-plan-catalog function${NC}"
  exit 1
fi

echo "   Found function: $FUNCTION_NAME"
PAYLOAD='{"sources": ["eia", "openei"], "states": ["TX"]}'

echo "   Invoking function for Texas..."
RESULT=$(aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --region us-east-1 \
  --payload "$PAYLOAD" \
  --cli-binary-format raw-in-base64-out \
  /tmp/tx-lambda-response.json 2>&1)

if [ $? -eq 0 ]; then
  PLANS_UPDATED=$(cat /tmp/tx-lambda-response.json | jq -r '.plansUpdated // 0' 2>/dev/null || echo "0")
  if [ "$PLANS_UPDATED" != "null" ] && [ "$PLANS_UPDATED" != "0" ]; then
    echo -e "${GREEN}✅ Successfully populated $PLANS_UPDATED Texas energy plans!${NC}"
  else
    echo -e "${YELLOW}⚠️  Function executed. Check response:${NC}"
    cat /tmp/tx-lambda-response.json | jq '.' 2>/dev/null || cat /tmp/tx-lambda-response.json
  fi
else
  echo -e "${RED}❌ Failed to invoke function:${NC}"
  echo "$RESULT"
  exit 1
fi
echo ""

# Step 3: Verify Texas plans exist
echo "📋 Step 3: Verifying Texas plans in database..."
echo "   (This requires DynamoDB access - checking via API)"
echo -e "${YELLOW}⚠️  Manual verification needed:${NC}"
echo "   1. Log into the application"
echo "   2. Set user profile state to 'TX'"
echo "   3. Navigate to recommendations page"
echo "   4. Verify Texas plans are displayed"
echo ""

# Step 4: Test data summary
echo "📋 Step 4: Test Data Available"
echo "   Sample statements for Austin, Texas:"
echo "   - Location: 1234 Oak Street, Austin, TX 78701"
echo "   - Utility: Austin Energy"
echo "   - Files: sample-statements/2024-*.csv (12 months)"
echo "   - Suppliers: Reliant Energy, TXU Energy, Green Mountain Energy"
echo "   - Rates: \$0.115 - \$0.128/kWh"
echo ""

# Step 5: Manual testing checklist
echo "📋 Step 5: Manual Testing Checklist"
echo "   Complete these steps in the application:"
echo ""
echo "   [ ] 1. Set user profile state to 'TX'"
echo "        - Currently no UI - use API or add profile settings page"
echo ""
echo "   [ ] 2. Upload usage data"
echo "        - Navigate to /usage-data"
echo "        - Upload sample-statements/2024-*.csv files"
echo "        - OR manually enter 12 months of data"
echo ""
echo "   [ ] 3. Set current plan information"
echo "        - Enter supplier name (e.g., 'Reliant Energy')"
echo "        - Enter contract dates"
echo "        - Save plan information"
echo ""
echo "   [ ] 4. Set user preferences"
echo "        - Configure cost savings priority"
echo "        - Set renewable energy preference"
echo "        - Set contract type preference"
echo ""
echo "   [ ] 5. Generate recommendations"
echo "        - Navigate to /recommendations"
echo "        - Click 'Generate Recommendations'"
echo "        - Verify Texas plans are shown"
echo "        - Verify rates are ~\$0.12/kWh (Texas average)"
echo ""
echo "   [ ] 6. Compare plans"
echo "        - Select 2-3 plans"
echo "        - Click 'Compare Selected'"
echo "        - Verify comparison table shows Texas plans"
echo ""
echo "   [ ] 7. Select a plan"
echo "        - Click 'Select Plan' on a recommendation"
echo "        - Verify plan is saved"
echo "        - Verify redirect to dashboard"
echo ""
echo "   [ ] 8. Provide feedback"
echo "        - Click 'Provide Feedback'"
echo "        - Submit rating and comments"
echo "        - Verify feedback is saved"
echo ""
echo "   [ ] 9. Verify data persistence"
echo "        - Log out and log back in"
echo "        - Verify all data is still present"
echo "        - Verify user profile state = 'TX'"
echo ""

echo "📝 Testing Documentation"
echo "   Full testing guide: docs/END_TO_END_TESTING_TX.md"
echo ""

echo -e "${GREEN}✅ Test setup complete!${NC}"
echo "   Proceed with manual testing using the checklist above."
echo ""

