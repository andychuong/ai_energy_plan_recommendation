# Google OAuth Setup Guide

## Step-by-Step Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `Arbor AI Energy` (or your preferred name)
5. Click "Create"
6. Wait for project creation (may take a few seconds)

### Step 2: Enable Google Identity Services API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Identity Services API"
3. Click on "Google Identity Services API"
4. Click "Enable"
5. Wait for API to be enabled

### Step 3: Configure OAuth Consent Screen (IMPORTANT - Do This First)

**If you already created OAuth credentials without setting up scopes, see `GOOGLE_OAUTH_SCOPES_SETUP.md` for how to add scopes now.**

1. Go to "APIs & Services" → "OAuth consent screen"
2. Click "Create" or "Edit App" (if already created)
3. **User Type**: Select "External" (for public use)
4. Click "Create"
5. **App information**:
   - App name: `Arbor AI Energy Plan Recommendation Agent`
   - User support email: Your email
   - App logo: Optional
   - App domain: Optional for now
   - Developer contact information: Your email
   - Click "Save and Continue"
6. **Scopes** (IMPORTANT):
   - Click "Add or Remove Scopes"
   - In the scopes dialog, check these scopes:
     - `openid` - OpenID Connect
     - `email` - View your email address
     - `profile` - View your basic profile info
   - Click "Update"
   - Click "Save and Continue"
7. **Test users** (for development):
   - Click "Add Users"
   - Add your email address
   - Click "Add"
   - Click "Save and Continue"
8. **Summary**:
   - Review your settings
   - Click "Back to Dashboard"

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. **Note**: If you haven't configured OAuth consent screen yet, you'll be prompted. See Step 3 above for detailed instructions.

4. Create OAuth client ID:
   - **Application type**: Web application
   - **Name**: Arbor AI Energy Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - Add your production URL when ready (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/`
     - Add your production callback URL when ready (e.g., `https://yourdomain.com/auth/callback`)
   - Click "Create"

5. **Copy the credentials**:
   - **Client ID**: Copy this (starts with something like `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (starts with `GOCSPX-...`)
   - **Important**: Save these securely - you'll need them for Amplify secrets

### Step 4: Set Amplify Secrets

1. Open your terminal in the project root
2. Set the Google Client ID:
   ```bash
   npx ampx sandbox secret set GOOGLE_CLIENT_ID
   ```
   - When prompted, paste your Google Client ID
   - Press Enter

3. Set the Google Client Secret:
   ```bash
   npx sandbox secret set GOOGLE_CLIENT_SECRET
   ```
   - When prompted, paste your Google Client Secret
   - Press Enter

### Step 5: Update Auth Configuration

The auth configuration file is already set up. You just need to uncomment the Google OAuth section.

**File**: `amplify/auth/resource.ts`

Uncomment the `externalProviders` section and make sure Google is included:

```typescript
externalProviders: {
  google: {
    clientId: secret('GOOGLE_CLIENT_ID'),
    clientSecret: secret('GOOGLE_CLIENT_SECRET'),
  },
  callbackUrls: [
    'http://localhost:3000/',
    'http://localhost:3000/auth/callback',
  ],
  logoutUrls: ['http://localhost:3000/'],
},
```

### Step 6: Restart Amplify Sandbox

1. Stop the current sandbox (Ctrl+C)
2. Restart it:
   ```bash
   npx ampx sandbox
   ```

The sandbox will detect the changes and redeploy with Google OAuth enabled.

### Step 7: Verify Setup

1. Check that secrets are set:
   ```bash
   npx ampx sandbox secret list
   ```
   You should see:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

2. Check sandbox logs for any errors
3. The `amplify_outputs.json` file should be generated with OAuth configuration

## Troubleshooting

### Issue: "Invalid client" error

**Solution**: 
- Verify Client ID and Client Secret are correct
- Check that redirect URIs match exactly (including trailing slashes)
- Make sure OAuth consent screen is configured

### Issue: "Redirect URI mismatch"

**Solution**:
- Add the exact callback URL to Google Cloud Console
- Make sure URLs match exactly (http vs https, trailing slashes)
- Common callback URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/`

### Issue: "Access blocked: This app's request is invalid"

**Solution**:
- Make sure OAuth consent screen is published (or add test users)
- For development, add your email as a test user
- Check that required scopes are added

### Issue: Secrets not found

**Solution**:
- Make sure you set secrets in the same sandbox environment
- Check secret names match exactly: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- List secrets: `npx ampx sandbox secret list`

## Production Setup

When deploying to production:

1. **Update OAuth Consent Screen**:
   - Publish the app (if not already published)
   - Add production domain to authorized domains

2. **Update Redirect URIs**:
   - Add production callback URL to Google Cloud Console
   - Update `amplify/auth/resource.ts` with production URLs

3. **Set Production Secrets**:
   - Use production Amplify environment
   - Set secrets in production environment

## Security Best Practices

- Never commit Client ID or Client Secret to repository
- Use Amplify secrets for all sensitive data
- Rotate secrets regularly
- Use different OAuth apps for development and production
- Monitor OAuth usage in Google Cloud Console

## Next Steps

After Google OAuth is set up:

1. Configure frontend to use Google OAuth
2. Test sign-in flow
3. Add Facebook OAuth (optional)
4. Set up production OAuth credentials

---

**Version**: 1.0  
**Last Updated**: November 2025

