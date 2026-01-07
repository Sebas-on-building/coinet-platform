# OAuth Authentication Setup Guide

## Overview

The Coinet platform supports OAuth authentication via Google and GitHub. This allows users to sign in using their existing accounts without creating a new password.

## Required Environment Variables

### Google OAuth

Add these to your Railway environment variables:

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### GitHub OAuth

Add these to your Railway environment variables:

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## How to Get OAuth Credentials

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - User Type: External (for public use)
   - App name: Coinet AI
   - Authorized domains: `coinet.ai`
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://api.coinet.ai/auth/google/callback`
     - `http://localhost:3000/auth/google/callback` (for local development)
7. Copy the **Client ID** and **Client Secret**

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the form:
   - Application name: Coinet AI
   - Homepage URL: `https://app.coinet.ai`
   - Authorization callback URL: `https://api.coinet.ai/auth/github/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

## OAuth Flow

### Google OAuth Flow

1. User clicks "Sign in with Google" button
2. Frontend redirects to: `GET /auth/google?redirect=<frontend_callback_url>`
3. Backend redirects to Google OAuth consent screen
4. User authorizes the application
5. Google redirects to: `GET /auth/google/callback?code=<auth_code>&state=<state>`
6. Backend exchanges code for access token
7. Backend fetches user info from Google
8. Backend creates/updates user in database
9. Backend generates JWT token
10. Backend redirects to frontend with token: `<redirect_url>?token=<jwt_token>`
11. Frontend stores token and redirects to dashboard

### GitHub OAuth Flow

Same flow as Google, but using GitHub's OAuth endpoints:
- Initiation: `GET /auth/github`
- Callback: `GET /auth/github/callback`

## Error Handling

If OAuth is not configured, the API will return:

```json
{
  "success": false,
  "error": {
    "code": "OAUTH_NOT_CONFIGURED",
    "message": "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
  }
}
```

## Security Features

- **State parameter**: Prevents CSRF attacks by including a state token in the OAuth flow
- **Secure token storage**: OAuth users don't have passwords stored
- **Session management**: OAuth logins create sessions just like regular logins
- **JWT tokens**: Same token format as email/password authentication

## Testing

### Local Development

1. Set up OAuth apps with callback URLs pointing to `http://localhost:3000/auth/google/callback`
2. Set environment variables in `.env` file
3. Test the flow:
   - Visit `http://localhost:3000/auth/google?redirect=http://localhost:5173/auth/callback`
   - Complete OAuth flow
   - Verify token is returned

### Production

1. Ensure OAuth apps are configured with production callback URLs
2. Set environment variables in Railway dashboard
3. Test the flow on `https://app.coinet.ai/auth`

## Troubleshooting

### "Route GET /auth/google not found"

- Ensure the routes are deployed (check Railway deployment logs)
- Verify the routes file is included in the build

### "OAUTH_NOT_CONFIGURED"

- Check that environment variables are set in Railway
- Verify variable names are correct (case-sensitive)
- Restart the service after adding environment variables

### "invalid_state" error

- This usually means the OAuth flow was interrupted
- Try the flow again from the beginning

### Token exchange fails

- Verify OAuth credentials are correct
- Check that callback URLs match exactly in OAuth app settings
- Ensure OAuth app is not in "testing" mode (for Google) or has proper scopes
