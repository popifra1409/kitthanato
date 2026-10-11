/* ============================================================
   SESSION UTILISATEUR (token + profil + permissions)
   ------------------------------------------------------------
   Seul endroit qui lit / écrit le localStorage pour l'auth.
============================================================ */

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
        return "";
    }
}

export function getUser() {
    try {
        const brut = localStorage.getItem(USER_KEY);
        return brut ? JSON.parse(brut) : null;
    } catch {
        return null;
    }
}

export function setSession({ token, user }) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) {
        localStorage.setItem(
            USER_KEY,
            JSON.stringify({
                ...user,
                role: String(user.role || "").trim().toUpperCase(),
                permissions: Array.isArray(user.permissions) ? user.permissions : [],
            })
        );
    }
}

export function updateUser(user) {
    setSession({ user });
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("role"); // ancienne clé, conservée pour nettoyage
}

export function isAuthenticated() {
    return Boolean(getToken() && getUser());
}

/* ------------------------------------------------------------
   AUTORISATIONS
   Le backend renvoie la liste des permissions de l'utilisateur
   (ex. "depots.view"). "*" = super-administrateur.
------------------------------------------------------------ */

export function hasPermission(permission, user = getUser()) {
    if (!permission) return true;
    const perms = user?.permissions || [];
    if (perms.includes("*")) return true;

    const liste = Array.isArray(permission) ? permission : [permission];
    return liste.some((p) => perms.includes(p));
}

export function hasRole(roles, user = getUser()) {
    const liste = Array.isArray(roles) ? roles : [roles];
    return liste
        .map((r) => String(r).toUpperCase())
        .includes(String(user?.role || "").toUpperCase());
}

/* Première page accessible après connexion, selon les permissions. */
export function pageAccueil(user = getUser()) {
    const ordre = [
        ["dashboard.view", "/dashboard"],
        ["depots.view", "/DepotCorps"],
        ["declarations.view", "/declarations"],
        ["sorties.view", "/Sortie"],
        ["transferts.view", "/transfert"],
        ["levees.view", "/PlanningLevees"],
        ["statistiques.view", "/Statistiques"],
        ["utilisateurs.view", "/Parametres?section=utilisateurs"],
        ["roles.view", "/Parametres?section=roles"],
        ["referentiels.manage", "/Parametres?section=prestations"],
        ["historique.view", "/Parametres?section=historique"],
        ["corbeille.view", "/Parametres?section=corbeille"],
    ];
    const trouve = ordre.find(([perm]) => hasPermission(perm, user));
    return trouve ? trouve[1] : "/acces-refuse";
}
