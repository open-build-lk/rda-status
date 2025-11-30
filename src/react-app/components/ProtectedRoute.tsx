import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isInitialized } = useAuthStore();
  const location = useLocation();

  // Wait for auth to initialize before making decisions
  if (!isInitialized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Not logged in, redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Logged in but insufficient permissions, redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
