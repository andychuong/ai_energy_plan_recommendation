# GitHub Secrets Setup Guide

## Overview

This document outlines the GitHub Secrets that need to be configured for the CI/CD pipeline to work properly.

## Required Secrets

### AWS Credentials

**AWS_ACCESS_KEY_ID**
- Description: AWS access key ID for Amplify deployment
- How to get: AWS IAM Console → Create IAM user → Generate access key
- Required permissions: Amplify deployment permissions

**AWS_SECRET_ACCESS_KEY**
- Description: AWS secret access key for Amplify deployment
- How to get: Generated with AWS_ACCESS_KEY_ID
- Required permissions: Amplify deployment permissions

**AMPLIFY_APP_ID**
- Description: AWS Amplify application ID
- How to get: AWS Amplify Console → App Settings → App ID
- Format: String (e.g., "d1234567890")

### Application Environment Variables

**REACT_APP_API_URL**
- Description: API endpoint URL for the application
- Format: URL (e.g., "https://api.example.com")
- Note: Used during build process

**REACT_APP_GOOGLE_MAPS_API_KEY**
- Description: Google Maps API key for address lookup
- How to get: Google Cloud Console → APIs & Services → Credentials
- Format: String

**REACT_APP_OPENAI_API_KEY**
- Description: OpenAI API key for LLM services
- How to get: OpenAI Platform → API Keys
- Format: String (starts with "sk-")
- Note: Keep this secret secure

### Optional Secrets

**SNYK_TOKEN**
- Description: Snyk API token for security scanning
- How to get: Snyk Dashboard → Settings → API Token
- Format: String
- Note: Optional, only needed if using Snyk

## How to Set Secrets

1. Go to GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Enter secret name and value
5. Click "Add secret"

## Security Best Practices

- Never commit secrets to repository
- Use GitHub Secrets for all sensitive data
- Rotate secrets regularly
- Use least privilege principle for AWS credentials
- Monitor secret usage in GitHub Actions logs
- Use different secrets for different environments (dev, staging, prod)

## Environment-Specific Secrets

For different environments, consider using:
- `DEV_` prefix for development secrets
- `STAGING_` prefix for staging secrets
- `PROD_` prefix for production secrets

## Verification

After setting secrets, verify they work by:
1. Running a test workflow
2. Checking workflow logs (secrets are masked)
3. Verifying deployment succeeds

---

**Version**: 1.0  
**Last Updated**: 2025

