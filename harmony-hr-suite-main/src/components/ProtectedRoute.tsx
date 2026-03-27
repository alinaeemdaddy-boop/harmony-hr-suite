import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
    permission: string; // e.g. "manage_onboarding"
    children: JSX.Element;
}

/**
 * Renders `children` only if the current user has the required permission.
 * Otherwise redirects to the auth page (or you could render a NotAuthorized component).
 */
export const ProtectedRoute = ({ permission, children }: ProtectedRouteProps) => {
    const { checkPermission } = useAuth();
    const location = useLocation();

    if (!checkPermission(permission)) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    return children;
};
