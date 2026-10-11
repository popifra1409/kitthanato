import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../services/SessionContext";
import { pageAccueil } from "../services/session";

function AccesRefuse() {
    const { user, logout } = useSession();
    const navigate = useNavigate();
    const accueil = user ? pageAccueil(user) : "/";

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "12px",
                padding: "16px",
                textAlign: "center",
            }}
        >
            <h1>Accès refusé</h1>

            <p>
                Vous n'avez pas les autorisations nécessaires pour accéder à
                cette page.
                {user?.role_libelle && (
                    <>
                        <br />
                        Rôle actuel : <strong>{user.role_libelle}</strong>
                    </>
                )}
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
                {user && accueil !== "/acces-refuse" && (
                    <Link to={accueil} className="primary-button">
                        Retour à l'accueil
                    </Link>
                )}
                <button
                    type="button"
                    className="secondary-button"
                    onClick={async () => {
                        await logout();
                        navigate("/", { replace: true });
                    }}
                >
                    Changer de compte
                </button>
            </div>
        </div>
    );
}

export default AccesRefuse;
