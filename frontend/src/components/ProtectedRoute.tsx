import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  allowedRoles?: ('DRIVER' | 'OWNER' | 'ADMIN')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if user does not have permissions
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
