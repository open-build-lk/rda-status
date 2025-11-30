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

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Invalid credentials");
      }

      // Refresh session to get user data
      await get().refreshSession();
      set({ isLoading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (data: RegisterData): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
      });

      if (result.error) {
        throw new Error(result.error.message || "Registration failed");
      }

      // Refresh session to get user data
      await get().refreshSession();
      set({ isLoading: false });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
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
    set({ user: null, error: null });
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
}));

// Initialize session on app load
if (typeof window !== "undefined") {
  useAuthStore.getState().refreshSession();
}
