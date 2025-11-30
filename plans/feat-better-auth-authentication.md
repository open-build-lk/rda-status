# feat: Add Better-Auth for Authentication

## Overview

Implement better-auth as the authentication solution for the RDA Status platform, replacing the current custom JWT-based authentication with insecure SHA-256 password hashing. This plan covers Phase 1 (email/password), with groundwork for Phase 2 (Google OAuth) and Phase 3 (Organization & RBAC alignment).

## Problem Statement

The current authentication implementation has critical security issues:
- **Insecure Password Hashing**: Uses SHA-256 via Web Crypto API (`src/worker/routes/auth.ts:26-40`), which is NOT suitable for password hashing (no salt, no key stretching)
- **Client-Side Token Storage**: JWT stored in localStorage via Zustand persist, vulnerable to XSS
- **No Email Verification**: Users can register with any email without verification
- **No Password Reset**: Missing password recovery flow
- **Limited Session Management**: No server-side session tracking or revocation capability

## Proposed Solution

Migrate to **better-auth**, a TypeScript-native, framework-agnostic authentication library that provides:
- Secure password hashing (bcrypt/argon2)
- Session-based authentication with httpOnly cookies
- Built-in email verification and password reset flows
- Plugin architecture for organizations and RBAC
- First-class Drizzle ORM support

## Technical Approach

### Current Stack Compatibility

| Component | Current | Better-Auth Support |
|-----------|---------|---------------------|
| Backend | Hono 4.8.2 on Cloudflare Workers | Framework-agnostic, works with Hono |
| Database | Cloudflare D1 (SQLite) | Drizzle adapter with SQLite provider |
| ORM | Drizzle 0.44.7 | First-class Drizzle support |
| Frontend | React 19 + Vite | React client hooks available |
| State | Zustand 5.0.9 | Can integrate or replace |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Auth Store (Zustand)  │  Better-Auth React Client (optional)   │
│  - useSession hook     │  - signIn.email()                      │
│  - user state          │  - signUp.email()                      │
│  - isAuthenticated     │  - signOut()                           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (cookies)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Hono + Workers)                    │
├─────────────────────────────────────────────────────────────────┤
│  /api/auth/*           │  Better-Auth Handler                   │
│  - /sign-up/email      │  - Session management                  │
│  - /sign-in/email      │  - Password hashing (bcrypt)           │
│  - /sign-out           │  - Cookie handling                     │
│  - /get-session        │  - CSRF protection                     │
├─────────────────────────────────────────────────────────────────┤
│  Custom Middleware                                               │
│  - requireAuth()       │  Validate better-auth session          │
│  - requireRole()       │  Check user.role in allowed list       │
│  - requireScope()      │  Filter by provinceScope/districtScope │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Drizzle ORM
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (Cloudflare D1)                    │
├─────────────────────────────────────────────────────────────────┤
│  users (extended)      │  session (new)     │  account (new)    │
│  - id                  │  - id              │  - id             │
│  - email               │  - userId          │  - userId         │
│  - name                │  - token           │  - providerId     │
│  - emailVerified (new) │  - expiresAt       │  - accountId      │
│  - image (new)         │  - ipAddress       │  - password       │
│  - role                │  - userAgent       │  - accessToken    │
│  - provinceScope       │  - createdAt       │  - refreshToken   │
│  - districtScope       │  - updatedAt       │  - createdAt      │
│  - isActive            │                    │  - updatedAt      │
│  - createdAt           │                    │                   │
│  - updatedAt (new)     │                    │                   │
│  - lastLogin           │                    │                   │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Email/Password Authentication (This Plan)
- Replace custom JWT with better-auth sessions
- Migrate password hashing to bcrypt
- Add password reset flow
- Preserve existing role system
- Preserve geographic scoping

#### Phase 2: Google OAuth (Future)
- Add Google OAuth provider
- Implement account linking
- Handle OAuth-only accounts

#### Phase 3: Organization & RBAC (Future)
- Add better-auth organization plugin
- Map provinces/districts to organizations
- Implement fine-grained permissions

---

## Database Schema Changes

### Extend Existing Users Table

```sql
-- Migration: Add better-auth required fields to users table
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN image TEXT;
ALTER TABLE users ADD COLUMN updated_at INTEGER;
ALTER TABLE users ADD COLUMN password_hash_algorithm TEXT DEFAULT 'sha256';

-- Update existing users
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE users SET password_hash_algorithm = 'sha256' WHERE password_hash_algorithm IS NULL;
```

### Add Session Table

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX session_user_id_idx ON session(user_id);
CREATE INDEX session_token_idx ON session(token);
CREATE INDEX session_expires_at_idx ON session(expires_at);
```

### Add Account Table (for OAuth, Phase 2)

```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX account_user_id_idx ON account(user_id);
CREATE UNIQUE INDEX account_provider_account_idx ON account(provider_id, account_id);
```

### Drizzle Schema

```typescript
// src/worker/db/schema.ts - additions

// Extend users table
export const users = sqliteTable("users", {
  // ... existing fields ...
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
  passwordHashAlgorithm: text("password_hash_algorithm").default("sha256"),
});

// New session table
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// New account table (for OAuth in Phase 2)
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

---

## Implementation Details

### 1. Better-Auth Server Configuration

```typescript
// src/worker/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { users, session, account } from "../db/schema";

export function createAuth(env: Env) {
  return betterAuth({
    database: drizzleAdapter(db(env.DB), {
      provider: "sqlite",
      schema: {
        user: users,
        session: session,
        account: account,
      },
    }),

    baseURL: env.BETTER_AUTH_URL || "http://localhost:5173",
    secret: env.BETTER_AUTH_SECRET,

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      requireEmailVerification: false, // Phase 1: disabled, enable in Phase 3

      // Custom password verification for gradual migration
      async verifyPassword({ password, hash }) {
        // Check if legacy SHA-256 hash
        if (!hash.startsWith("$2")) {
          const sha256Hash = await hashSHA256(password);
          return sha256Hash === hash;
        }
        // Use bcrypt for new hashes
        return await verifyBcrypt(password, hash);
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },

    advanced: {
      useSecureCookies: env.ENVIRONMENT === "production",
      generateId: () => crypto.randomUUID(),
    },

    trustedOrigins: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      env.PRODUCTION_URL,
    ].filter(Boolean),

    // Custom user fields
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "citizen",
        },
        provinceScope: {
          type: "string",
          required: false,
        },
        districtScope: {
          type: "string",
          required: false,
        },
        isActive: {
          type: "boolean",
          required: true,
          defaultValue: true,
        },
        phone: {
          type: "string",
          required: false,
        },
        lastLogin: {
          type: "date",
          required: false,
        },
      },
    },
  });
}
```

### 2. Mount Auth Routes

```typescript
// src/worker/routes/auth.ts
import { Hono } from "hono";
import { createAuth } from "../auth";

const authRoutes = new Hono<{ Bindings: Env }>();

// Mount better-auth handler for all /api/auth/* routes
authRoutes.all("/*", async (c) => {
  const auth = createAuth(c.env);
  return await auth.handler(c.req.raw);
});

export default authRoutes;
```

```typescript
// src/worker/index.ts
import authRoutes from "./routes/auth";

// Replace existing auth route mount
app.route("/api/auth", authRoutes);
```

### 3. Auth Middleware

```typescript
// src/worker/middleware/auth.ts
import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { createAuth } from "../auth";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  provinceScope?: string;
  districtScope?: string;
  isActive: boolean;
}

// Require authentication
export async function requireAuth(c: Context, next: Next) {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized - Please sign in" });
  }

  // Check if user is active
  if (!session.user.isActive) {
    throw new HTTPException(403, { message: "Account is deactivated" });
  }

  // Set auth context
  c.set("auth", {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    provinceScope: session.user.provinceScope,
    districtScope: session.user.districtScope,
    isActive: session.user.isActive,
  } as AuthContext);

  c.set("session", session);

  // Update lastLogin (debounced, not on every request)
  await updateLastLoginIfNeeded(c.env.DB, session.user.id);

  await next();
}

// Require specific roles
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get("auth") as AuthContext;

    if (!auth) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    if (!allowedRoles.includes(auth.role)) {
      throw new HTTPException(403, {
        message: `Forbidden - Requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    await next();
  };
}

// Geographic scope filtering
export function requireScope() {
  return async (c: Context, next: Next) => {
    const auth = c.get("auth") as AuthContext;

    if (!auth) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    // SUPER_ADMIN has no scope restrictions
    if (auth.role === "super_admin") {
      c.set("scopeFilter", null);
      await next();
      return;
    }

    // Set scope filter for queries
    c.set("scopeFilter", {
      provinceScope: auth.provinceScope,
      districtScope: auth.districtScope,
    });

    await next();
  };
}

// Helper to get auth context
export function getAuth(c: Context): AuthContext {
  const auth = c.get("auth") as AuthContext;
  if (!auth) {
    throw new HTTPException(401, { message: "Not authenticated" });
  }
  return auth;
}
```

### 4. Password Migration Logic

```typescript
// src/worker/auth/password-migration.ts
import { eq } from "drizzle-orm";
import { users } from "../db/schema";

// SHA-256 hash (legacy)
async function hashSHA256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Bcrypt hash (new)
async function hashBcrypt(password: string): Promise<string> {
  // Use @node-rs/bcrypt for Cloudflare Workers compatibility
  const bcrypt = await import("@node-rs/bcrypt");
  return await bcrypt.hash(password, 10);
}

// Migrate password on successful login
export async function migratePasswordIfNeeded(
  db: D1Database,
  userId: string,
  plainPassword: string,
  currentHash: string,
  currentAlgorithm: string
) {
  // Only migrate if still on SHA-256
  if (currentAlgorithm !== "sha256") {
    return;
  }

  // Rehash with bcrypt
  const newHash = await hashBcrypt(plainPassword);

  // Update user record
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      passwordHashAlgorithm: "bcrypt",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`Migrated password for user ${userId} from SHA-256 to bcrypt`);
}
```

### 5. Frontend Auth Client

```typescript
// src/react-app/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5173",
  fetchOptions: {
    credentials: "include", // Include cookies
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### 6. Updated Auth Store (Zustand)

```typescript
// src/react-app/stores/auth.ts
import { create } from "zustand";
import { authClient } from "../lib/auth-client";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  provinceScope?: string;
  districtScope?: string;
  isActive: boolean;
  phone?: string;
  emailVerified: boolean;
  image?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false, error: error.message || "Login failed" });
      return false;
    }

    set({
      user: data.user as User,
      isLoading: false,
      error: null,
    });

    return true;
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });

    const { data: result, error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
    });

    if (error) {
      set({ isLoading: false, error: error.message || "Registration failed" });
      return false;
    }

    set({
      user: result.user as User,
      isLoading: false,
      error: null,
    });

    return true;
  },

  logout: async () => {
    set({ isLoading: true });

    await authClient.signOut();

    set({
      user: null,
      isLoading: false,
      error: null,
    });
  },

  refreshUser: async () => {
    set({ isLoading: true });

    const { data: session } = await authClient.getSession();

    if (session?.user) {
      set({
        user: session.user as User,
        isLoading: false,
      });
    } else {
      set({
        user: null,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
```

### 7. Protected Route Component

```typescript
// src/react-app/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, refreshUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    refreshUser();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

---

## Role-Based Access Control Matrix

| Role | Submit Report | Verify Report | Manage Projects | Manage Users | Geographic Scope |
|------|--------------|---------------|-----------------|--------------|------------------|
| SUPER_ADMIN | Yes | Yes | Yes | Yes | National (no filter) |
| ADMIN | Yes | Yes | Yes | Province only | Province |
| PLANNER | Yes | No | Yes | No | Province/District |
| FIELD_OFFICER | Yes | Yes | No | No | District |
| CITIZEN | Yes | No | No | No | None (own reports) |
| PUBLIC | Yes (anon) | No | No | No | None |
| STAKEHOLDER | No | No | Read only | No | Assigned scope |

---

## Environment Variables

### Development (.dev.vars)

```bash
# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:5173

# Environment
ENVIRONMENT=development

# Google OAuth (Phase 2)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Production (wrangler.toml secrets)

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

Generate secure secret:
```bash
openssl rand -base64 32
```

---

## Migration Strategy

### Step 1: Schema Migration (Non-Breaking)

1. Add new columns to users table (nullable initially)
2. Create session and account tables
3. Run migration: `bun run db:migrate`

### Step 2: Deploy Backend with Dual Support

1. Deploy better-auth alongside existing JWT
2. Both auth methods work during transition
3. Feature flag: `USE_BETTER_AUTH=true`

### Step 3: Gradual Password Migration

1. On successful login with SHA-256, rehash to bcrypt
2. Track migration progress via `password_hash_algorithm` column
3. After 3 months, force password reset for unmigrated users

### Step 4: Frontend Migration

1. Update auth store to use better-auth client
2. Test all auth flows
3. Deploy frontend

### Step 5: Cleanup

1. Remove JWT secret from environment
2. Remove old auth middleware code
3. Remove `password_hash_algorithm` column (all bcrypt)

---

## Testing Requirements

### Unit Tests

```typescript
// tests/auth/password-migration.test.ts
describe("Password Migration", () => {
  it("should verify SHA-256 hash for legacy users", async () => {
    // ...
  });

  it("should verify bcrypt hash for new users", async () => {
    // ...
  });

  it("should migrate SHA-256 to bcrypt on successful login", async () => {
    // ...
  });
});
```

### Integration Tests

```typescript
// tests/auth/auth-flows.test.ts
describe("Authentication Flows", () => {
  it("should register new user with email/password", async () => {
    // ...
  });

  it("should login existing user", async () => {
    // ...
  });

  it("should reject login with wrong password", async () => {
    // ...
  });

  it("should reject login for deactivated user", async () => {
    // ...
  });

  it("should logout and clear session", async () => {
    // ...
  });

  it("should enforce role-based access", async () => {
    // ...
  });
});
```

### E2E Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("complete registration and login flow", async ({ page }) => {
  // Navigate to register
  await page.goto("/register");

  // Fill form
  await page.fill('input[name="name"]', "Test User");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "SecureP@ss123");
  await page.fill('input[name="confirmPassword"]', "SecureP@ss123");

  // Submit
  await page.click('button[type="submit"]');

  // Should redirect to home
  await expect(page).toHaveURL("/");

  // Should show user name in header
  await expect(page.locator("header")).toContainText("Test User");
});
```

---

## Success Criteria

### Functional Requirements

- [ ] Users can register with email/password
- [ ] Users can login with email/password
- [ ] Users can logout
- [ ] Sessions persist across page refreshes (cookie-based)
- [ ] Protected routes redirect to login
- [ ] Role-based access control works
- [ ] Geographic scope filtering works
- [ ] Existing users can login (SHA-256 migration)
- [ ] Password reset flow works (if email configured)

### Non-Functional Requirements

- [ ] Passwords hashed with bcrypt (cost factor 10)
- [ ] Sessions stored in httpOnly, secure, SameSite cookies
- [ ] No sensitive data in localStorage
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints (better-auth default)
- [ ] Session expiry: 7 days
- [ ] All auth endpoints return within 500ms

### Quality Gates

- [ ] 80%+ test coverage on auth code
- [ ] No security warnings from npm audit
- [ ] Passes OWASP authentication checklist
- [ ] Load tested: 100 concurrent logins

---

## Dependencies

### NPM Packages to Add

```json
{
  "dependencies": {
    "better-auth": "^1.3.0",
    "@node-rs/bcrypt": "^1.10.0"
  }
}
```

### External Services (Optional)

- **Email Provider** (for password reset, email verification)
  - Resend (recommended for developers)
  - SendGrid
  - Cloudflare Email Workers

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Better-auth incompatible with Workers | Medium | Critical | Build PoC first, have fallback plan |
| Password migration incomplete | Low | Medium | Track progress, force reset after deadline |
| Session performance on D1 | Medium | Medium | Use cookie cache, benchmark early |
| Breaking changes during migration | Medium | High | Feature flag, gradual rollout, quick rollback |

---

## Future Considerations

### Phase 2: Google OAuth

- Add `socialProviders.google` configuration
- Implement account linking (same email = same user)
- Update login UI with "Continue with Google" button
- Handle OAuth-only users (no password)

### Phase 3: Organization & RBAC

- Add better-auth `organization` plugin
- Map provinces to organizations
- Fine-grained permissions per organization
- Admin UI for user/role management

---

## References

### Internal

- Current auth implementation: `src/worker/routes/auth.ts`
- Current middleware: `src/worker/middleware/auth.ts`
- User schema: `src/worker/db/schema.ts:5-24`
- Role types: `src/shared/types.ts:1-11`
- Frontend auth store: `src/react-app/stores/auth.ts`

### External

- [Better Auth Documentation](https://www.better-auth.com/docs/)
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
