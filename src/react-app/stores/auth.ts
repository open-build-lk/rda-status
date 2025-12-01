import { create } from "zustand";
import { authClient } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  provinceScope?: string;
  districtScope?: string;
  image?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  magicLinkSent: boolean;
  magicLinkEmail: string | null;
}

interface AuthActions {
  sendMagicLink: (email: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  resetMagicLinkState: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  magicLinkSent: false,
  magicLinkEmail: null,

  sendMagicLink: async (email: string, name?: string): Promise<boolean> => {
    set({ isLoading: true, error: null, magicLinkSent: false });
    try {
      const result = await authClient.signIn.magicLink({
        email,
        name,
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to send magic link");
      }

      set({
        isLoading: false,
        magicLinkSent: true,
        magicLinkEmail: email,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send magic link";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore errors during sign out
    }
    set({ user: null, error: null, magicLinkSent: false, magicLinkEmail: null });
  },

  refreshSession: async () => {
    try {
      const session = await authClient.getSession();

      if (session.data?.user) {
        const user = session.data.user;
        set({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user as unknown as { role?: string }).role || "citizen",
            phone: (user as unknown as { phone?: string }).phone,
            provinceScope: (user as unknown as { provinceScope?: string }).provinceScope,
            districtScope: (user as unknown as { districtScope?: string }).districtScope,
            image: user.image || undefined,
          },
          isInitialized: true,
          magicLinkSent: false,
          magicLinkEmail: null,
        });
      } else {
        set({ user: null, isInitialized: true });
      }
    } catch {
      set({ user: null, isInitialized: true });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  resetMagicLinkState: () => {
    set({ magicLinkSent: false, magicLinkEmail: null, error: null });
  },
}));

// Initialize session on app load
if (typeof window !== "undefined") {
  useAuthStore.getState().refreshSession();
}
