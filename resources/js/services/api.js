/* ============================================================
   API REST PRINCIPALE — POINT D'ENTRÉE UNIQUE
   ------------------------------------------------------------
   Toutes les pages passent par ce fichier pour parler au
   backend Laravel. Aucune URL ne doit être écrite en dur dans
   les composants.

   Usage :
       import api from "../services/api";
       const depots = await api.depots.list();
       await api.depots.create(donnees);

   Chaque fonction renvoie directement le corps JSON de la
   réponse. En cas d'erreur, une ApiError est levée
   (error.message, error.status, error.errors, error.firstMessage).
============================================================ */

import { get, post, put, del } from "./http";

/* Normalise une réponse "liste" quelle que soit sa forme
   ([...], {data: [...]}, {depots: [...]}, pagination...). */
export function asList(data, ...cles) {
    if (Array.isArray(data)) return data;
    for (const cle of [...cles, "data"]) {
        if (Array.isArray(data?.[cle])) return data[cle];
    }
    return [];
}

/* Fabrique CRUD standard pour une ressource REST. */
const ressource = (base) => ({
    list: (params) => get(`/${base}`, params),
    get: (id) => get(`/${base}/${id}`),
    create: (donnees) => post(`/${base}`, donnees),
    update: (id, donnees) => put(`/${base}/${id}`, donnees),
    remove: (id, raison) => del(`/${base}/${id}`, raison ? { raison } : undefined),
});

/* ---------------- AUTHENTIFICATION ---------------- */
export const auth = {
    login: (name, password) =>
        post("/login", { name, password }, { skipAuthRedirect: true }),
    logout: () => post("/logout", null, { skipAuthRedirect: true }),
    me: (config) => get("/me", undefined, config),
    changePassword: (donnees) => put("/me/password", donnees),
};

/* ---------------- MÉTIER ---------------- */
export const depots = {
    ...ressource("depots"),
    disponibles: () => get("/depots-disponibles"),
    caissonsDisponibles: (depotId) =>
        get("/caissons-disponibles", depotId ? { depot_id: depotId } : undefined),
    assignBox: (id, caisson_id) => put(`/depots/${id}/box`, { caisson_id }),
    sceller: (id) => put(`/depots/${id}/sceller`, {}),
    desceller: (id) => put(`/depots/${id}/desceller`, {}),
};

export const sorties = {
    ...ressource("sorties"),
    corpsDisponibles: () => get("/sorties/corps-disponibles"),
    paiement: (id, montant_paye) => post(`/sorties/${id}/paiement`, { montant_paye }),
};

export const transferts = ressource("transferts");

export const dashboard = {
    get: () => get("/dashboard"),
};

export const recherche = {
    globale: (texte, config) => get("/recherche", { q: texte }, config),
};

export const levees = {
    list: (params) => get("/levees", params),
};

export const declarations = {
    ...ressource("declarations"),
    dashboard: () => get("/declarations/dashboard"),
    defunts: () => get("/declarations/defunts"),
    depot: (depotId) => get(`/declarations/depot/${depotId}`),

};

export const statistiques = {
    get: (params) => get("/statistiques", params),
};

/* ---------------- RÉFÉRENTIELS ---------------- */
export const prestations = {
    ...ressource("prestations"),
    listAdmin: () => get("/prestations-admin"),
};

export const chapelles = {
    ...ressource("chapelles"),
    listAdmin: () => get("/chapelles-admin"),
};

export const professions = {
    list: (recherche = "") => get("/professions", { recherche }),
    create: (nom) => post("/professions", { nom }),
};

export const services = {
    list: (recherche = "") => get("/services", { recherche }),
    create: (nom) => post("/services", { nom }),
    update: (id, nom) => put(`/services/${id}`, { nom }),
    remove: (id) => del(`/services/${id}`),
};

/* ---------------- EMPLACEMENTS (chambres froides & caissons) ---------------- */
export const emplacements = {
    plan: () => get("/emplacements/plan"),
    chambres: {
        list: () => get("/chambres-froides"),
        create: (donnees) => post("/chambres-froides", donnees),
        update: (id, donnees) => put(`/chambres-froides/${id}`, donnees),
        toggleActif: (id) => put(`/chambres-froides/${id}/actif`, {}),
        ajouterCaisson: (id, code) =>
            post(`/chambres-froides/${id}/caissons`, { code }),
    },
    caissons: {
        update: (id, donnees) => put(`/caissons/${id}`, donnees),
        toggleActif: (id) => put(`/caissons/${id}/actif`, {}),
    },
};

/* ---------------- ADMINISTRATION ---------------- */
export const utilisateurs = {
    ...ressource("utilisateurs"),
    toggleActif: (id) => post(`/utilisateurs/${id}/toggle-actif`),
};

export const roles = ressource("roles");

export const permissions = {
    list: () => get("/permissions"),
};

export const historique = {
    list: (params) => get("/historique", params),
};

export const corbeille = {
    list: (params) => get("/corbeille", params),
    get: (id) => get(`/corbeille/${id}`),
};

const api = {
    auth,
    depots,
    sorties,
    transferts,
    dashboard,
    recherche,
    levees,
    declarations,
    statistiques,
    prestations,
    chapelles,
    professions,
    services,
    emplacements,
    utilisateurs,
    roles,
    permissions,
    historique,
    corbeille,
};

export default api;
