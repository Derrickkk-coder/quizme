import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";
import { PageLoader } from "../components/ui/Spinner";

export function roleHomePath(role: Role): string {
  if (role === "ADMIN") return "/app/admin";
  if (role === "TEACHER") return "/app/teacher";
  return "/app/student";
}

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={roleHomePath(user.role)} replace />;

  return <Outlet />;
}
