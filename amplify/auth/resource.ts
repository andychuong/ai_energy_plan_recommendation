import { defineAuth } from '@aws-amplify/backend';
import { secret } from '@aws-amplify/backend';

/**
 * Define authentication configuration
 * @see https://docs.amplify.aws/react/build-a-backend/auth
 * 
 * OAuth Setup:
 * 1. Create OAuth app in Google Cloud Console
 * 2. Set secrets: npx ampx sandbox secret set GOOGLE_CLIENT_ID
 * 3. Set secrets: npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
 * 4. Restart sandbox: npx ampx sandbox
 * 
 * Production URLs:
 * Update PRODUCTION_DOMAIN below with your actual production domain before deploying
 * Example: 'https://sparksave.app' or 'https://app.sparksave.com'
 * Set to null or empty string to disable production URLs (development only)
 */
const PRODUCTION_DOMAIN: string | null = 'https://main.d2rn94kbvpfx34.amplifyapp.com';

export const auth = defineAuth({
  loginWith: {
    email: true,
    // Google OAuth temporarily disabled for pipeline deployment
    // TODO: Re-enable once secret path/permissions issue is resolved
    // The secrets exist in Parameter Store but AmplifySecretFetcherResourceProviderLambda
    // cannot access them. Need to investigate IAM permissions or path format.
    // externalProviders: {
    //   google: {
    //     clientId: secret('GOOGLE_CLIENT_ID'),
    //     clientSecret: secret('GOOGLE_CLIENT_SECRET'),
    //   },
    //   // Facebook OAuth - uncomment when ready
    //   // facebook: {
    //   //   clientId: secret('FACEBOOK_CLIENT_ID'),
    //   //   clientSecret: secret('FACEBOOK_CLIENT_SECRET'),
    //   // },
    //   // Callback and logout URLs for OAuth
    //   // Development URLs (localhost) are always included
    //   // Production URLs are added when PRODUCTION_DOMAIN is set above
    //   callbackUrls: [
    //     'http://localhost:3000/',
    //     'http://localhost:3000/auth/callback',
    //     // Production URLs - added when PRODUCTION_DOMAIN is set
    //     ...(PRODUCTION_DOMAIN ? [
    //       `${PRODUCTION_DOMAIN}/`,
    //       `${PRODUCTION_DOMAIN}/auth/callback`,
    //     ] : []),
    //   ],
    //   logoutUrls: [
    //     'http://localhost:3000/',
    //     // Production logout URL - added when PRODUCTION_DOMAIN is set
    //     ...(PRODUCTION_DOMAIN ? [
    //       `${PRODUCTION_DOMAIN}/`,
    //     ] : []),
    //   ],
    // },
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
});

