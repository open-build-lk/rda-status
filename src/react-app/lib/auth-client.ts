import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, magicLinkClient } from "better-auth/client/plugins";
import type { createAuth } from "../../worker/auth";

// Infer auth type from server configuration
type Auth = ReturnType<typeof createAuth>;

// Create the better-auth React client with magic link support
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [
    inferAdditionalFields<Auth>(),
    magicLinkClient(),
  ],
});

// Export typed hooks and methods
export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient;
