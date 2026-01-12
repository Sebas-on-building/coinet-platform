# Clerk Authentication Setup Guide

## ✅ Current Status
- Clerk is installed and configured
- SignIn/SignUp components are integrated
- Routes are protected with middleware

## 🔧 To Enable Social Login (Google, GitHub)

### Step 1: Enable Providers in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **User & Authentication** → **Social Connections**
4. Enable the providers you want:
   - **Google**: Click "Enable" and configure OAuth credentials
   - **GitHub**: Click "Enable" and configure OAuth credentials

### Step 2: Configure OAuth Credentials

#### For Google:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-clerk-instance.clerk.accounts.dev/v1/oauth_callback`
4. Copy Client ID and Client Secret to Clerk Dashboard

#### For GitHub:
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `https://your-clerk-instance.clerk.accounts.dev/v1/oauth_callback`
4. Copy Client ID and Client Secret to Clerk Dashboard

### Step 3: Verify Configuration

After enabling providers, the social login buttons will automatically appear in your SignIn/SignUp components. No code changes needed!

## 🎯 Demo Mode (Optional)

If you want a demo mode button, you can add it using Clerk's test mode or create a mock user. However, Clerk's components handle authentication automatically - the buttons will work once providers are enabled.

## 📝 Environment Variables

Your `.env.local` should have:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

These are already configured! ✅

## 🚀 Testing

1. Visit `http://localhost:3000/auth/login`
2. Social login buttons (Google/GitHub) will appear automatically once enabled in Clerk Dashboard
3. Email/password authentication works immediately
4. After sign-in, users are redirected to `/dashboard`
