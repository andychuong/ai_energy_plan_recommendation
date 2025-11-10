# Google OAuth Quick Start

## Quick Setup (5 minutes)

### 1. Create Google OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: Arbor AI Energy
   - Your email for support
   - Scopes: email, profile, openid
   - Save and continue through all steps

4. Create OAuth client:
   - Application type: **Web application**
   - Name: Arbor AI Energy Web Client
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000/
     ```
   - Click "Create"
   - **Copy Client ID and Client Secret**

### 2. Set Amplify Secrets

```bash
# Set Google Client ID
npx ampx sandbox secret set GOOGLE_CLIENT_ID
# Paste your Client ID when prompted

# Set Google Client Secret
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
# Paste your Client Secret when prompted
```

### 3. Restart Sandbox

```bash
# Stop current sandbox (Ctrl+C if running)
# Then restart:
npx ampx sandbox
```

### 4. Verify

```bash
# Check secrets are set
npx ampx sandbox secret list
```

You should see:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## That's It!

Google OAuth is now configured. The auth resource file is already updated to use Google OAuth.

## Next: Frontend Integration

After the sandbox is running, you'll need to:

1. Configure frontend to use Amplify auth
2. Add Google sign-in button
3. Test the OAuth flow

See `GOOGLE_OAUTH_SETUP.md` for detailed instructions and troubleshooting.

---

**Version**: 1.0  
**Last Updated**: November 2025

