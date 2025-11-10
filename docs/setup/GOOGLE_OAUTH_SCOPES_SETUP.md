# Google OAuth Scopes Setup

## How to Configure OAuth Scopes

If you've already created the OAuth client but didn't set up scopes, follow these steps:

### Step 1: Go to OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. You should see your app configuration

### Step 2: Edit Scopes

1. On the OAuth consent screen page, click **"Edit App"** or **"Edit"** button
2. Navigate to the **"Scopes"** section (usually Step 2 or 3)
3. Click **"Add or Remove Scopes"**

### Step 3: Add Required Scopes

In the scopes dialog, you need to add these scopes:

**Required Scopes:**
- `openid` - OpenID Connect (for authentication)
- `email` - View your email address
- `profile` - View your basic profile info

**How to add:**
1. In the scopes dialog, you'll see a list of scopes
2. Search for or find:
   - **openid** - Check the box
   - **email** - Check the box  
   - **profile** - Check the box
3. Click **"Update"** or **"Save"**
4. Continue through the rest of the OAuth consent screen setup
5. Click **"Save and Continue"** through all steps
6. Click **"Back to Dashboard"** when done

### Step 4: Add Test Users (For Development)

1. Still on the OAuth consent screen page
2. Go to the **"Test users"** section
3. Click **"Add Users"**
4. Add your email address (the one you'll use to test)
5. Click **"Add"**
6. Click **"Save"**

**Important**: If your app is in "Testing" mode, only test users can sign in. Add your email as a test user.

### Step 5: Verify Scopes

1. Go to **APIs & Services** → **OAuth consent screen**
2. Check the **"Scopes"** section
3. You should see:
   - `openid`
   - `email`
   - `profile`

## Quick Reference: Direct Links

- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent
- **Credentials**: https://console.cloud.google.com/apis/credentials

## Alternative: If You Can't Find Scopes

If you're having trouble finding the scopes section:

1. **Delete and Recreate** (if you just created it):
   - Go to **APIs & Services** → **Credentials**
   - Delete your OAuth client
   - Create a new one, and this time:
     - When prompted for OAuth consent screen, configure it properly
     - Add scopes: `openid`, `email`, `profile`
     - Add test users
     - Then create the OAuth client

2. **Use the API Library**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Identity Services API"
   - Make sure it's enabled
   - This ensures the scopes are available

## What Scopes Do We Need?

For authentication with Amplify, we need:

- **openid**: Required for OpenID Connect authentication
- **email**: To get user's email address
- **profile**: To get user's basic profile (name, picture, etc.)

These are the minimum scopes needed for Google OAuth to work with AWS Cognito.

## Troubleshooting

### Issue: "Invalid scope" error

**Solution**:
- Make sure scopes are added in OAuth consent screen
- Verify scopes are: `openid`, `email`, `profile`
- Make sure Google Identity Services API is enabled

### Issue: "Access blocked" error

**Solution**:
- Add your email as a test user
- Make sure app is in "Testing" mode (for development)
- Or publish the app (for production)

### Issue: Can't find scopes section

**Solution**:
- Make sure you're editing the OAuth consent screen, not the OAuth client
- Go to: APIs & Services → OAuth consent screen
- Click "Edit App"
- Navigate through the steps to find "Scopes"

## Step-by-Step Visual Guide

1. **Go to OAuth Consent Screen**:
   ```
   Google Cloud Console
   → APIs & Services
   → OAuth consent screen
   ```

2. **Click "Edit App"** (or "Edit" button)

3. **Navigate to Scopes Step**:
   - Step 1: App information
   - Step 2: Scopes ← **This is where you add scopes**
   - Step 3: Test users
   - Step 4: Summary

4. **Add Scopes**:
   - Click "Add or Remove Scopes"
   - Check: `openid`, `email`, `profile`
   - Click "Update"

5. **Add Test Users**:
   - Add your email address
   - Save

6. **Save All Changes**:
   - Click "Save and Continue" through all steps
   - Click "Back to Dashboard"

## After Setting Up Scopes

Once scopes are configured:

1. **Restart Amplify Sandbox** (if running):
   ```bash
   # Stop sandbox (Ctrl+C)
   npx ampx sandbox
   ```

2. **Test OAuth Flow**:
   - The OAuth flow should now work
   - When users sign in with Google, they'll see the consent screen
   - They'll grant permission for email and profile access

## Next Steps

After scopes are set up:
- Test Google OAuth sign-in
- Verify user email and profile are retrieved
- Set up frontend to use Google OAuth

---

**Version**: 1.0  
**Last Updated**: November 2025

