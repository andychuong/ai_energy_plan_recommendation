# AWS Amplify Setup Guide

## Overview

This guide walks you through setting up AWS Amplify for the project. You need to initialize Amplify before adding services like authentication.

## Amplify Gen 1 vs Gen 2

### Amplify Gen 1 (Traditional CLI)
- **Approach**: Configuration-based, uses `amplify/` directory
- **Pros**: Mature, well-documented, full CLI support
- **Cons**: More configuration files, less code-first
- **Best for**: Traditional projects, existing Amplify projects

### Amplify Gen 2 (Code-First)
- **Approach**: Code-first, uses TypeScript/JavaScript files
- **Pros**: Modern, code-first, better TypeScript support
- **Cons**: Newer, less documentation, different workflow
- **Best for**: New projects, TypeScript-first approach

## Recommendation: Amplify Gen 2

For this project, **Amplify Gen 2 is recommended** because:
- Better TypeScript support
- Code-first approach aligns with our architecture
- Modern developer experience
- Better integration with React

## Setup Instructions

### Option 1: Amplify Gen 2 (Recommended)

#### Step 1: Install Amplify Gen 2

```bash
npm install aws-amplify @aws-amplify/backend @aws-amplify/backend-cli
```

#### Step 2: Initialize Amplify Gen 2

```bash
npx ampx sandbox
```

This will:
- Create `amplify/` directory
- Set up backend configuration
- Configure authentication
- Set up API and database

#### Step 3: Configure Authentication

The sandbox will guide you through setting up authentication. Choose:
- **Authentication method**: Email/Password and Social providers
- **Social providers**: Google, Facebook (optional)
- **MFA**: Optional

#### Step 4: Configure Backend

After initialization, you'll have:
- `amplify/backend.ts` - Backend configuration
- `amplify/auth/resource.ts` - Authentication configuration
- `amplify/data/resource.ts` - Database configuration (if using Data)

### Option 2: Amplify Gen 1 (Traditional)

If you prefer Gen 1, follow these steps:

#### Step 1: Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
```

#### Step 2: Configure AWS Credentials

```bash
amplify configure
```

This will:
- Open AWS Console to create IAM user
- Ask for Access Key ID and Secret Access Key
- Configure default region

#### Step 3: Initialize Amplify

```bash
amplify init
```

You'll be prompted for:
- **Project name**: arbor-ai-energy
- **Environment name**: dev (or production)
- **Default editor**: Your preferred editor
- **Type of app**: javascript
- **Framework**: react
- **Source directory**: src
- **Distribution directory**: build
- **Build command**: npm run build
- **Start command**: npm run dev
- **AWS profile**: Your configured profile

#### Step 4: Add Authentication

```bash
amplify add auth
```

Choose:
- **Default configuration**: Yes
- **Sign in method**: Email and/or Phone Number
- **Social providers**: Google, Facebook (optional)
- **Advanced settings**: Configure as needed

#### Step 5: Add API (Optional - can do later)

```bash
amplify add api
```

Choose:
- **API type**: REST or GraphQL
- **REST**: Lambda functions
- **GraphQL**: AppSync with DynamoDB

## Current Setup Status

Based on your terminal output, you need to:

1. **Choose Gen 1 or Gen 2**
   - If Gen 2: Run `npx ampx sandbox`
   - If Gen 1: Run `amplify init` first, then `amplify add auth`

2. **For Gen 1**: You need to run `amplify init` before `amplify add auth`

## Quick Start (Gen 2 - Recommended)

```bash
# Install dependencies
npm install aws-amplify @aws-amplify/backend @aws-amplify/backend-cli

# Initialize Amplify Gen 2
npx ampx sandbox

# Follow the prompts to set up:
# - Authentication (Cognito)
# - API (if needed)
# - Storage (S3, if needed)
```

## Quick Start (Gen 1 - Traditional)

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

## After Initialization

### Gen 2 Structure

```
amplify/
├── backend.ts          # Main backend configuration
├── auth/
│   └── resource.ts    # Authentication configuration
├── data/
│   └── resource.ts    # Database configuration (optional)
└── function/
    └── [function-name]/
        └── resource.ts # Lambda function configuration
```

### Gen 1 Structure

```
amplify/
├── backend/
│   ├── api/
│   ├── auth/
│   ├── function/
│   └── storage/
├── .config/
└── team-provider-info.json
```

## Configuration Files

### Gen 2: Backend Configuration

**File**: `amplify/backend.ts`

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

export const backend = defineBackend({
  auth,
  data,
});
```

### Gen 2: Authentication Configuration

**File**: `amplify/auth/resource.ts`

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID!,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      },
      callbackUrls: ['http://localhost:3000/'],
      logoutUrls: ['http://localhost:3000/'],
    },
  },
});
```

## Frontend Integration

### Gen 2: Configure Amplify in Frontend

**File**: `src/lib/amplify.ts`

```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
```

### Gen 1: Configure Amplify in Frontend

**File**: `src/lib/amplify.ts`

```typescript
import { Amplify } from 'aws-amplify';
import awsconfig from '../aws-exports';

Amplify.configure(awsconfig);
```

## Next Steps After Setup

1. **Update .gitignore** (already done)
   - `.aws-amplify/` is already ignored
   - `amplify_outputs.json` should be ignored (Gen 2)
   - `aws-exports.js` should be ignored (Gen 1)

2. **Create Amplify configuration in frontend**
   - Create `src/lib/amplify.ts`
   - Import and configure in `src/main.tsx`

3. **Set up authentication UI**
   - Use `@aws-amplify/ui-react` components
   - Create auth pages

4. **Test authentication**
   - Test sign up, sign in, sign out
   - Test OAuth flows

## Troubleshooting

### Issue: "No Amplify backend project files detected"

**Solution**: Run `amplify init` (Gen 1) or `npx ampx sandbox` (Gen 2) first

### Issue: AWS credentials not configured

**Solution**: Run `amplify configure` (Gen 1) or configure AWS credentials in your environment

### Issue: Region not set

**Solution**: Set default region in `amplify configure` or use `--region` flag

## Environment Variables

After setup, you'll need to configure:

**Gen 2**:
- `GOOGLE_CLIENT_ID` (if using Google OAuth)
- `GOOGLE_CLIENT_SECRET` (if using Google OAuth)
- `FACEBOOK_CLIENT_ID` (if using Facebook OAuth)
- `FACEBOOK_CLIENT_SECRET` (if using Facebook OAuth)

**Gen 1**:
- AWS credentials configured via `amplify configure`
- OAuth credentials configured in Amplify Console

## Documentation

- **Amplify Gen 2**: https://docs.amplify.aws/react/start/quickstart/
- **Amplify Gen 1**: https://docs.amplify.aws/cli/
- **Authentication**: https://docs.amplify.aws/react/build-a-backend/auth/

---

**Version**: 1.0  
**Last Updated**: 2025

