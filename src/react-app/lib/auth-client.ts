import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { createAuth } from "../../worker/auth";

// Infer auth type from server configuration
type Auth = ReturnType<typeof createAuth>;

// Create the better-auth React client with inferred additional fields
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [inferAdditionalFields<Auth>()],
});

// Export typed hooks and methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
