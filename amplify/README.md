# Amplify Backend

This directory contains the AWS Amplify Gen 2 backend configuration.

## Structure

```
amplify/
├── backend.ts          # Main backend configuration
├── auth/
│   └── resource.ts    # Authentication configuration
├── data/               # Database configuration (to be added)
├── function/           # Lambda functions (to be added)
└── storage/            # S3 storage (to be added)
```

## Setup

1. Install dependencies:
   ```bash
   cd amplify
   npm install
   ```

2. Start sandbox:
   ```bash
   npx ampx sandbox
   ```

## Configuration

- **Authentication**: Configured in `auth/resource.ts`
- **OAuth Providers**: Google and Facebook (requires environment variables)
- **User Attributes**: Email (required), Name (optional)

## Environment Variables

Set these in your `.env` file:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Development

The sandbox runs in watch mode and automatically deploys changes to your backend.

---

**Version**: 1.0  
**Last Updated**: November 2025

