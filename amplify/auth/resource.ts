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
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
      },
      // Facebook OAuth - uncomment when ready
      // facebook: {
      //   clientId: secret('FACEBOOK_CLIENT_ID'),
      //   clientSecret: secret('FACEBOOK_CLIENT_SECRET'),
      // },
      callbackUrls: [
        'http://localhost:3000/',
        'http://localhost:3000/auth/callback',
      ],
      logoutUrls: ['http://localhost:3000/'],
    },
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
});

