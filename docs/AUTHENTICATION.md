# Authentication System

This document describes the Better-Auth implementation for RDA Status.

## Overview

RDA Status uses [Better-Auth](https://better-auth.com) for authentication, replacing the previous JWT-based system. Better-Auth provides:

- Session-based authentication with httpOnly cookies
- Secure password hashing (bcrypt)
- Built-in session management
- Type-safe API

## Configuration

### Server Setup

Located in `src/worker/auth/index.ts`:

```typescript
export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,     // Refresh daily
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,            // 5 min cache
      },
    },

    user: {
      additionalFields: {
        phone: { type: "string", input: true },
        role: { type: "string", defaultValue: "citizen", input: false },
        provinceScope: { type: "string", input: false },
        districtScope: { type: "string", input: false },
        isActive: { type: "boolean", defaultValue: true, input: false },
        lastLogin: { type: "date", input: false },
      },
    },
  });
}
```

### Client Setup

Located in `src/react-app/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [inferAdditionalFields<Auth>()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
```

## Database Schema

### Tables

**user** - User accounts
```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER DEFAULT false,
  image TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  -- Custom fields
  phone TEXT,
  role TEXT DEFAULT 'citizen',
  province_scope TEXT,
  district_scope TEXT,
  is_active INTEGER DEFAULT true,
  last_login INTEGER
);
```

**session** - Active sessions
```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT REFERENCES user(id) ON DELETE CASCADE
);
```

**account** - Authentication credentials
```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT REFERENCES user(id) ON DELETE CASCADE,
  password TEXT,
  -- OAuth fields (for future use)
  access_token TEXT,
  refresh_token TEXT
);
```

**verification** - Email/password reset tokens
```sql
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
```

## API Endpoints

Better-Auth handles these routes at `/api/auth/*`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sign-up/email` | POST | Register with email/password |
| `/sign-in/email` | POST | Login with email/password |
| `/sign-out` | POST | End session |
| `/session` | GET | Get current session |

## Middleware

### Required Authentication

```typescript
import { authMiddleware } from "../middleware/auth";

app.get("/protected", authMiddleware(), (c) => {
  const auth = c.get("auth");
  // auth.userId, auth.email, auth.role available
});
```

### Optional Authentication

```typescript
import { optionalAuthMiddleware } from "../middleware/auth";

app.get("/public", optionalAuthMiddleware(), (c) => {
  const auth = c.get("auth"); // May be undefined
});
```

### Role-Based Access

```typescript
import { authMiddleware, requireRole } from "../middleware/auth";

app.get("/admin",
  authMiddleware(),
  requireRole("admin", "super_admin"),
  (c) => { /* ... */ }
);
```

## Frontend Usage

### Auth Store

```typescript
import { useAuthStore } from "@/stores/auth";

function LoginButton() {
  const { user, login, logout, isLoading } = useAuthStore();

  if (user) {
    return <button onClick={logout}>Logout</button>;
  }

  return <button onClick={() => login(email, password)}>Login</button>;
}
```

### Protected Routes

```typescript
import { ProtectedRoute } from "@/components/ProtectedRoute";

<Route path="/dashboard" element={
  <ProtectedRoute allowedRoles={["admin", "planner"]}>
    <Dashboard />
  </ProtectedRoute>
} />
```

## User Roles

| Role | Description | Access |
|------|-------------|--------|
| `citizen` | Default role | Submit reports |
| `field_officer` | Field verification | Verify reports, dashboard |
| `planner` | Project management | Projects, dashboard |
| `admin` | Administration | User management |
| `super_admin` | Full access | Everything |
| `stakeholder` | View-only | Dashboard, projects (read) |

## Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=<minimum 32 characters>

# Optional
BETTER_AUTH_URL=http://localhost:5173
PRODUCTION_URL=https://your-domain.com
ENVIRONMENT=development
MAILGUN_API_KEY=<for email verification>
```

## Security Features

1. **Password Hashing** - bcrypt with automatic salting
2. **Session Cookies** - httpOnly, secure in production
3. **CSRF Protection** - Built into Better-Auth
4. **Session Expiry** - 7-day maximum, refreshed on activity
5. **Cookie Cache** - 5-minute client-side cache for performance

## Future Enhancements

1. **Email Verification** - Configure Mailgun for verification emails
2. **Password Reset** - Enable forgot password flow
3. **Google OAuth** - Add social login
4. **Two-Factor Auth** - TOTP support via Better-Auth plugin
