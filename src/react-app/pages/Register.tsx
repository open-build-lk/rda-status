import { Navigate } from "react-router-dom";

// Register is now handled via magic link on the Login page
// New users are automatically created when they click the magic link
export function Register() {
  return <Navigate to="/login" replace />;
}
