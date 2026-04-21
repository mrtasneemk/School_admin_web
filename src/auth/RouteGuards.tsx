import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({
  anyOf,
  children
}: {
  anyOf: string[];
  children: React.ReactNode;
}) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!role || !anyOf.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

