# Google OAuth 2.0 Setup Guide

This guide explains how to set up and use Google OAuth authentication in the Employee Training Platform.

## Overview

The OAuth integration provides:
- Google OAuth 2.0 authentication flow
- Email domain validation (@bluetrailsoft.com only)
- Automatic user provisioning for first-time logins
- JWT token generation for authenticated users
- Deactivated account protection

## Prerequisites

1. **Google Cloud Console Setup**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorized redirect URIs:
     - Development: `http://localhost:8000/api/auth/oauth/callback`
     - Production: `https://yourdomain.com/api/auth/oauth/callback`

2. **Environment Variables**
   
   Add to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id-here
   GOOGLE_CLIENT_SECRET=your-google-client-secret-here
   GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/oauth/callback
   JWT_SECRET=your-jwt-secret
   SESSION_SECRET=your-session-secret
   ```

## Implementation

### 1. Initialize OAuth Service

```typescript
import { GoogleOAuthService } from './infrastructure/auth/GoogleOAuthService';
import { UserRepository } from './infrastructure/database/repositories/UserRepository';
import { AuthenticationService } from './domain/services/AuthenticationService';

const userRepository = new UserRepository();
const authService = new AuthenticationService(process.env.JWT_SECRET!);

const oauthService = new GoogleOAuthService(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    allowedDomain: 'bluetrailsoft.com',
  },
  userRepository,
  authService
);
```

### 2. Configure Express App

```typescript
import express from 'express';
import session from 'express-session';
import passport from 'passport';

const app = express();

// Session middleware (required by Passport)
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
```

### 3. Create OAuth Routes

```typescript
// Initiate OAuth flow
app.get('/api/auth/oauth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// OAuth callback handler
app.get('/api/auth/oauth/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  async (req, res) => {
    const { user, token } = req.user as any;
    
    // Option 1: Redirect to frontend with token
    res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
    
    // Option 2: Return JSON (for API-only)
    // res.json({ success: true, token, user: user.toJSON() });
  }
);
```

## OAuth Flow Diagram

```
1. User clicks "Login with Google" button
   ↓
2. Frontend redirects to: GET /api/auth/oauth/google
   ↓
3. Backend redirects to Google OAuth consent screen
   ↓
4. User authenticates with Google and grants permissions
   ↓
5. Google redirects back to: GET /api/auth/oauth/callback?code=xxx
   ↓
6. Backend exchanges code for access token and user profile
   ↓
7. Backend validates email domain (@bluetrailsoft.com)
   ↓
8. Backend checks if user exists in database
   ↓
9a. If user exists: Load user from database
9b. If new user: Create user account automatically
   ↓
10. Backend generates JWT token
   ↓
11. Backend returns token to frontend
   ↓
12. Frontend stores token and redirects to dashboard
```

## Domain Validation

The system enforces strict email domain validation:

**Allowed:**
- user@bluetrailsoft.com ✓
- admin@bluetrailsoft.com ✓
- john.doe@bluetrailsoft.com ✓

**Rejected:**
- user@gmail.com ✗
- user@otherdomain.com ✗
- user@bluetrailsoft.org ✗

## Auto-Provisioning

When a user authenticates via OAuth for the first time:

1. **Email Validation**: Verify email is @bluetrailsoft.com
2. **User Creation**: Create new user account with:
   - Username: Extracted from email (before @)
   - Email: From OAuth profile
   - Password: NULL (OAuth users don't have passwords)
   - Role: EMPLOYEE (default)
   - Auth Provider: GOOGLE_OAUTH
   - Active: true

3. **Username Collision**: If username exists, append 8-character UUID suffix

## Security Features

### 1. Domain Restriction
Only @bluetrailsoft.com emails can authenticate via OAuth.

### 2. Deactivated Account Protection
Even if a user authenticates successfully with Google, if their account is deactivated in the system, authentication will fail.

### 3. No Password Storage
OAuth users have `passwordHash: null` since they authenticate through Google.

### 4. JWT Token Security
- Tokens expire after 24 hours
- Tokens include user role for authorization
- Tokens are signed with JWT_SECRET

### 5. Session Management
- Sessions are stateless (JWT-based)
- No server-side session storage required
- Logout invalidates tokens via blacklist

## Frontend Integration

### Login Button

```typescript
// React component
function LoginPage() {
  const handleGoogleLogin = () => {
    // Redirect to OAuth initiation endpoint
    window.location.href = 'http://localhost:8000/api/auth/oauth/google';
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>
        Login with Google
      </button>
    </div>
  );
}
```

### Callback Handler

```typescript
// React callback page
function OAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      // Handle OAuth error
      console.error('OAuth failed:', error);
      navigate('/login');
    } else if (token) {
      // Store token and redirect to dashboard
      localStorage.setItem('authToken', token);
      navigate('/dashboard');
    }
  }, []);

  return <div>Authenticating...</div>;
}
```

## Testing

Run OAuth tests:
```bash
npm test -- GoogleOAuthService.test.ts
npm test -- oauth-integration.test.ts
```

## Troubleshooting

### "Email domain must be @bluetrailsoft.com"
- User is trying to authenticate with a non-company email
- Verify the email domain in Google account

### "No email provided by OAuth provider"
- Google profile doesn't include email
- Check OAuth scopes include 'email'
- Verify email is verified in Google account

### "User account is deactivated"
- User account exists but is deactivated
- Admin needs to reactivate the account

### "Redirect URI mismatch"
- Callback URL doesn't match Google Console configuration
- Update authorized redirect URIs in Google Cloud Console
- Verify GOOGLE_CALLBACK_URL environment variable

## Requirements Validated

- **1.3**: OAuth redirect to Google provider
- **1.4**: Accept @bluetrailsoft.com emails
- **1.5**: Reject non-bluetrailsoft.com emails
- **1.6**: Auto-provision new OAuth users
