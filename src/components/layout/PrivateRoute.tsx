import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUserProfile } from '@/lib/session';

interface PrivateRouteProps {
  access: string[];
}

const PrivateRoute = ({ access: requiredAccess }: PrivateRouteProps) => {
  const user = getCurrentUserProfile();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Defensive check for user.access
  if (!user.access || !Array.isArray(user.access)) {
    // Handle cases where access is missing or not an array
    // This can happen if the user has an old session in localStorage
    console.error("User profile is missing 'access' property or it's not an array.", user);
    // Redirect to login to force a new session
    return <Navigate to="/login" />;
  }

  // Allow access if the route doesn't require any specific permissions
  if (requiredAccess.length === 0) {
    return <Outlet />;
  }

  // Check if the user has at least one of the required permissions
  const hasAccess = requiredAccess.some(path => user.access.includes(path));

  if (hasAccess) {
    return <Outlet />;
  } else {
    // If the user doesn't have access, redirect to the home page
    return <Navigate to="/" />;
  }
};

export default PrivateRoute;
