import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import "./Login.css";
import { pageAccueil } from "../services/session";
import { useSession } from "../services/SessionContext";

function Login() {
    const navigate = useNavigate();
    const { login, user } = useSession();

    const [identifiant, setIdentifiant] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    /* Déjà connecté → page d'accueil autorisée */
    if (user && !loading) {
        return <Navigate to={pageAccueil(user)} replace />;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const user = await login(identifiant, password);

            /* Redirection vers la première page autorisée */
            navigate(pageAccueil(user), { replace: true });
        } catch (error) {
            setError(error.firstMessage || error.message || "Impossible de contacter le serveur.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">THANATOPRAXIE</div>

                <div className="login-header">
                    <p>Connectez-vous à votre compte</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="login-field">
                        <label htmlFor="identifiant">Identifiant</label>
                        <input
                            id="identifiant"
                            type="text"
                            placeholder="Entrez votre identifiant"
                            value={identifiant}
                            onChange={(e) => setIdentifiant(e.target.value)}
                            required
                        />
                    </div>

                    <div className="login-field">
                        <div className="password-label">
                            <label htmlFor="password">Mot de passe</label>
                        </div>
                        <input
                            id="password"
                            type="password"
                            placeholder="Entrez votre mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="login-error">{error}</p>}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Connexion..." : "Connexion"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;