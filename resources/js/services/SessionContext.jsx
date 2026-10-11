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
    const [user, setUser] = useState(() => (getToken() ? getUser() : null));

    /* Rafraîchit le profil (rôle + permissions) depuis le serveur */
    const refresh = useCallback(async () => {
        if (!getToken()) return;
        try {
            const profil = await api.auth.me();
            setSession({ user: profil });
            setUser(getUser());
        } catch {
            /* 401 → l'intercepteur HTTP a déjà nettoyé la session */
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

    return <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession doit être utilisé dans <SessionProvider>.");
    return ctx;
}
