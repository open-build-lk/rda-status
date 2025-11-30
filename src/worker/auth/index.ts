/// <reference path="../../../worker-configuration.d.ts" />

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

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

    baseURL: env.BETTER_AUTH_URL || "http://localhost:5173",
    secret: env.BETTER_AUTH_SECRET,

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      requireEmailVerification: false, // Enable in production with email configured
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
    ].filter(Boolean) as string[],

    // Custom user fields
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
          input: true,
        },
        role: {
          type: "string",
          required: false,
          defaultValue: "citizen",
          input: false, // Don't allow users to set their own role
        },
        provinceScope: {
          type: "string",
          required: false,
          input: false,
        },
        districtScope: {
          type: "string",
          required: false,
          input: false,
        },
        isActive: {
          type: "boolean",
          required: false,
          defaultValue: true,
          input: false,
        },
        lastLogin: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },

    // Email configuration for password reset (using Mailgun)
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // Will be implemented when Mailgun is configured
        console.log(`Verification email for ${user.email}: ${url}`);
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
