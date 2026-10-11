/* ============================================================
   CLIENT HTTP UNIQUE (axios)
   ------------------------------------------------------------
   - URL de base commune (/api par défaut, ou VITE_API_URL)
   - Ajout automatique du token Bearer
   - Erreurs normalisées (ApiError)
   - Déconnexion automatique sur 401
============================================================ */

import axios from "axios";
import { getToken, clearSession } from "./session";

export const API_URL = import.meta.env.VITE_API_URL || "/api";

const http = axios.create({
    baseURL: API_URL,
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

http.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/* Erreur applicative homogène pour toutes les pages. */
export class ApiError extends Error {
    constructor({ message, status = 0, errors = null, data = null }) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.errors = errors; // erreurs de validation Laravel { champ: [msg] }
        this.data = data;
    }

    /* Premier message de validation, ou le message général. */
    get firstMessage() {
        if (this.errors) {
            const champ = Object.keys(this.errors)[0];
            const msg = champ && this.errors[champ]?.[0];
            if (msg) return msg;
        }
        return this.message;
    }
}

const MESSAGES_PAR_STATUT = {
    401: "Session expirée. Veuillez vous reconnecter.",
    403: "Vous n'avez pas la permission d'effectuer cette action.",
    404: "Ressource introuvable.",
    419: "Session expirée. Veuillez recharger la page.",
    422: "Certaines informations sont invalides.",
    500: "Erreur interne du serveur.",
};

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);

        const status = error.response?.status ?? 0;
        const data = error.response?.data ?? null;

        if (status === 401 && !error.config?.skipAuthRedirect) {
            clearSession();
            if (window.location.pathname !== "/") {
                window.location.assign("/");
            }
        }

        const message =
            data?.message ||
            MESSAGES_PAR_STATUT[status] ||
            (status === 0
                ? "Impossible de contacter le serveur."
                : "Une erreur est survenue.");

        return Promise.reject(
            new ApiError({ message, status, errors: data?.errors ?? null, data })
        );
    }
);

/* Raccourcis qui renvoient directement le corps de la réponse. */
export const get = (url, params, config = {}) =>
    http.get(url, { ...config, params }).then((r) => r.data);

export const post = (url, body, config) =>
    http.post(url, body, config).then((r) => r.data);

export const put = (url, body, config) =>
    http.put(url, body, config).then((r) => r.data);

export const patch = (url, body, config) =>
    http.patch(url, body, config).then((r) => r.data);

export const del = (url, body, config = {}) =>
    http.delete(url, { ...config, data: body }).then((r) => r.data);

export default http;
