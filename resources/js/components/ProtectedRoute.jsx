import { Navigate } from "react-router-dom";
import { useSession } from "../services/SessionContext";

/**
 * Protège une route.
 *   <ProtectedRoute permission="depots.view">            → permission requise
 *   <ProtectedRoute permission={["a.view", "b.view"]}>   → l'une ou l'autre
 *   <ProtectedRoute allowedRoles={["ADMIN"]}>            → (ancien mode) par rôle
 */
function ProtectedRoute({ children, permission, allowedRoles = [] }) {
    const { user, can, hasRole } = useSession();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (permission && !can(permission)) {
        return <Navigate to="/acces-refuse" replace />;
    }

    if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
        return <Navigate to="/acces-refuse" replace />;
    }

    return children;
}

export default ProtectedRoute;
