/// <reference path="../../../worker-configuration.d.ts" />

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

// Helper to send email via Mailgun
async function sendEmailViaMailgun(
  env: Env,
  to: string,
  subject: string,
  html: string
) {
  const domain = "mail.road-lk.org";
  const from = `Sri Lanka Road Status <noreply@${domain}>`;

  const formData = new FormData();
  formData.append("from", from);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);

  const response = await fetch(
    `https://api.mailgun.net/v3/${domain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Mailgun error:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return response.json();
}

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
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,

    // Magic link only - no password authentication
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
              <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Sign in to Sri Lanka Road Status</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                  Click the button below to sign in to your account. This link will expire in 5 minutes.
                </p>
                <a href="${url}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                  Sign In
                </a>
                <p style="color: #999; font-size: 14px; margin-top: 24px;">
                  If you didn't request this email, you can safely ignore it.
                </p>
              </div>
            </body>
            </html>
          `;

          await sendEmailViaMailgun(
            env,
            email,
            "Sign in to Sri Lanka Road Status",
            html
          );
        },
        expiresIn: 300, // 5 minutes
        disableSignUp: false, // Allow new users to sign up via magic link
      }),
    ],

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
          input: false,
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
  });
}

export type Auth = ReturnType<typeof createAuth>;
