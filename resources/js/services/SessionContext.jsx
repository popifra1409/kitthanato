/* ============================================================
   CONTEXTE DE SESSION
   ------------------------------------------------------------
   Expose l'utilisateur connecté et ses permissions à toute
   l'application, et les rafraîchit depuis /api/me au démarrage
   (un admin a pu modifier le rôle entre-temps).
============================================================ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "./api";
import {
    getToken,
    getUser,
    setSession,
    clearSession,
    hasPermission,
    hasRole,
} from "./session";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
    /*
     * Au démarrage, une session trouvée dans le navigateur n'est PAS crue
     * sur parole : elle peut venir de l'ancien front (format sans
     * permissions) ou porter un token expiré. On la vérifie via /api/me
     * avant d'afficher la moindre page (évite les redirections en boucle
     * entre la connexion et « Accès refusé »).
     */
    const [user, setUser] = useState(null);
    const [pret, setPret] = useState(() => !getToken());

    const refresh = useCallback(async () => {
        if (!getToken()) {
            clearSession();
            setUser(null);
            return;
        }
        try {
            const profil = await api.auth.me({ skipAuthRedirect: true });
            setSession({ user: profil });
            setUser(getUser());
        } catch (error) {
            // Token invalide / compte désactivé → retour propre à la connexion
            if (error?.status === 401 || error?.status === 403) {
                clearSession();
                setUser(null);
            } else {
                // Serveur injoignable : on garde la session locale si elle est complète
                const local = getUser();
                setUser(Array.isArray(local?.permissions) ? local : null);
            }
        } finally {
            setPret(true);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = useCallback(async (name, password) => {
        const data = await api.auth.login(name, password);
        setSession({ token: data.token, user: data.user });
        const u = getUser();
        setUser(u);
        return u;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.auth.logout();
        } catch {
            /* déconnexion locale même si le serveur ne répond pas */
        }
        clearSession();
        setUser(null);
    }, []);

    const valeur = useMemo(
        () => ({
            user,
            login,
            logout,
            refresh,
            can: (permission) => hasPermission(permission, user),
            hasRole: (roles) => hasRole(roles, user),
        }),
        [user, login, logout, refresh]
    );

    if (!pret) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Inter, system-ui, sans-serif",
                    color: "#6a5f78",
                }}
            >
                Vérification de la session…
            </div>
        );
    }

    return <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession doit être utilisé dans <SessionProvider>.");
    return ctx;
}
