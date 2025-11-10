# Quick Start Guide

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS Account
- AWS CLI configured (optional, but recommended)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your API keys:
- Google Maps API key
- OpenAI API key
- Energy API keys (EIA, OpenEI, WattBuy, etc.)
- OAuth credentials (Google, Facebook) - if using social login

## Step 3: Initialize Amplify Backend

### For Amplify Gen 2 (Recommended)

```bash
# Navigate to amplify directory
cd amplify

# Install amplify dependencies
npm install

# Go back to root
cd ..

# Start Amplify sandbox
npx ampx sandbox
```

This will:
- Deploy authentication (Cognito)
- Create the backend infrastructure
- Generate `amplify_outputs.json` for frontend

### For Amplify Gen 1 (Alternative)

```bash
# Install Amplify CLI globally
npm install -g @aws-amplify/cli

# Configure AWS credentials
amplify configure

# Initialize Amplify
amplify init

# Add authentication
amplify add auth

# Push to AWS
amplify push
```

## Step 4: Configure Frontend

After Amplify is set up, configure the frontend:

1. Create `src/lib/amplify.ts`:

```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
```

2. Import in `src/main.tsx`:

```typescript
import './lib/amplify';
```

## Step 5: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Troubleshooting

### Issue: "amplify directory does not exist"

**Solution**: The `amplify/` directory has been created. Run:
```bash
cd amplify && npm install && cd ..
npx ampx sandbox
```

### Issue: AWS credentials not configured

**Solution**: 
1. Install AWS CLI: `brew install awscli` (macOS) or download from AWS
2. Configure: `aws configure`
3. Or set environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

### Issue: OAuth providers not working

**Solution**: 
1. Set up OAuth apps in Google/Facebook developer consoles
2. Add credentials to `.env` file
3. Update `amplify/auth/resource.ts` with correct callback URLs

## Next Steps

1. Set up authentication UI
2. Create usage data upload interface
3. Implement recommendation display
4. Add data visualizations

---

**Version**: 1.0  
**Last Updated**: 2025

