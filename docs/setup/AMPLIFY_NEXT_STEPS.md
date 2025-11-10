# Amplify Next Steps - After Google OAuth Setup

## Current Status

You've completed:
- [x] Google OAuth credentials created
- [x] OAuth scopes configured
- [x] Amplify backend structure created
- [x] Auth configuration file ready

## Next Steps

### Step 1: Set Amplify Secrets

Set your Google OAuth credentials as Amplify secrets:

```bash
# Set Google Client ID
npx ampx sandbox secret set GOOGLE_CLIENT_ID
# When prompted, paste your Google Client ID and press Enter

# Set Google Client Secret
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
# When prompted, paste your Google Client Secret and press Enter
```

**Note**: The secrets are stored securely in AWS and won't be visible in your code.

### Step 2: Verify Secrets Are Set

```bash
# List all secrets
npx ampx sandbox secret list
```

You should see:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Step 3: Start/Restart Amplify Sandbox

```bash
# If sandbox is running, stop it (Ctrl+C)
# Then start it:
npx ampx sandbox
```

The sandbox will:
- Deploy authentication (Cognito)
- Configure Google OAuth
- Generate `amplify_outputs.json` for frontend
- Watch for file changes

### Step 4: Verify Deployment

After the sandbox starts, check:

1. **Check for errors** in the sandbox output
2. **Verify `amplify_outputs.json` is generated** in the root directory
3. **Check the file contents** - it should have authentication configuration

### Step 5: Configure Frontend to Use Amplify

Once the sandbox is running and `amplify_outputs.json` is generated:

1. **Create Amplify configuration file**:
   - File: `src/lib/amplify.ts`
   - Import and configure Amplify

2. **Import in main app**:
   - Add to `src/main.tsx` or `src/App.tsx`

3. **Test authentication**:
   - Add sign-in/sign-up components
   - Test Google OAuth flow

## Detailed Steps

### Step 1: Set Secrets (Detailed)

Run these commands one at a time:

```bash
# First secret - Google Client ID
npx ampx sandbox secret set GOOGLE_CLIENT_ID
# You'll see: "Enter the secret value:"
# Paste your Client ID (starts with something like 123456789-abc.apps.googleusercontent.com)
# Press Enter

# Second secret - Google Client Secret
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
# You'll see: "Enter the secret value:"
# Paste your Client Secret (starts with GOCSPX-...)
# Press Enter
```

### Step 2: Verify Secrets

```bash
npx ampx sandbox secret list
```

Expected output:
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### Step 3: Start Sandbox

```bash
npx ampx sandbox
```

Expected output:
- Backend synthesized
- Type checks completed
- Deployment started
- Watching for file changes

### Step 4: Check Output File

After sandbox starts, check for `amplify_outputs.json` in the root directory:

```bash
ls -la amplify_outputs.json
```

The file should contain authentication configuration.

## Troubleshooting

### Issue: "Secret not found" error

**Solution**: Make sure you set the secrets before starting the sandbox:
```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
```

### Issue: Sandbox fails to start

**Solution**: 
- Check that secrets are set: `npx ampx sandbox secret list`
- Check for TypeScript errors in `amplify/` directory
- Make sure AWS credentials are configured

### Issue: OAuth not working

**Solution**:
- Verify redirect URIs match exactly in Google Cloud Console
- Check that scopes are configured (openid, email, profile)
- Make sure your email is added as a test user

## After Amplify is Running

Once the sandbox is running successfully:

1. **Frontend Integration** (Next):
   - Create `src/lib/amplify.ts` to configure Amplify
   - Add authentication UI components
   - Test Google OAuth sign-in

2. **Continue Phase 1**:
   - Set up project folder structure
   - Create memory bank data models
   - Set up additional Amplify services (API, storage, etc.)

## Quick Command Reference

```bash
# Set secrets
npx ampx sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET

# List secrets
npx ampx sandbox secret list

# Start sandbox
npx ampx sandbox

# Stop sandbox
Ctrl+C

# Delete sandbox (if needed)
npx ampx sandbox delete
```

---

**Version**: 1.0  
**Last Updated**: 2025

