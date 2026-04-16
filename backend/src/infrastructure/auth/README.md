# Authentication Infrastructure

This directory contains infrastructure-level authentication implementations, including OAuth integration.

## Components

### GoogleOAuthService

Handles Google OAuth 2.0 authentication flow with domain validation and auto-provisioning.

**Features:**
- Google OAuth 2.0 integration using Passport.js
- Email domain validation (@bluetrailsoft.com)
- Automatic user provisioning for first-time OAuth users
- JWT token generation for authenticated users

**Configuration:**
```typescript
const oauthService = new GoogleOAuthService(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    allowedDomain: 'bluetrailsoft.com'
  },
  userRepository,
  authenticationService
);
```

**Usage:**
```typescript
// In Express routes
app.get('/api/auth/oauth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/oauth/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    const { user, token } = req.user;
    res.json({ user, token });
  }
);
```

**Requirements Validated:**
- 1.3: OAuth redirect to Google
- 1.4: Accept @bluetrailsoft.com emails
- 1.5: Reject other email domains
- 1.6: Auto-provision new OAuth users

## Environment Variables

Required environment variables for OAuth:
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: OAuth callback URL (e.g., http://localhost:8000/api/auth/oauth/callback)

## Security Considerations

1. **Domain Validation**: Only @bluetrailsoft.com emails are allowed
2. **Auto-Provisioning**: New users are created with EMPLOYEE role by default
3. **No Password Storage**: OAuth users have null passwordHash
4. **Active Account Check**: Deactivated accounts cannot authenticate via OAuth
5. **Username Uniqueness**: If username collision occurs, UUID suffix is added
