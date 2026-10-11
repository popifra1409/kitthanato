import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Parametres.css";
import ConfirmDialog from "../components/ConfirmDialog";
import NotificationBox from "../components/NotificationBox";
import Corbeille from "./Corbeille";
import RolesPermissions from "./RolesPermissions";
import api, { asList } from "../services/api";
import { hasPermission } from "../services/session";

function Parametres() {
    /* =====================================================
       GESTION DE L'URL (section)
    ===================================================== */

    const [searchParams, setSearchParams] = useSearchParams();

    /* Onglet initial = ?section= de l'URL ou "utilisateurs" */
    const sectionUrl = searchParams.get("section") || "utilisateurs";

    const [onglet, setOnglet] = useState(sectionUrl);

    /* Synchroniser l'onglet avec l'URL */
    useEffect(() => {
        setOnglet(sectionUrl);
    }, [sectionUrl]);

    /* Changer d'onglet → mettre à jour l'URL */
    const changerOnglet = (nouvelOnglet) => {
        setOnglet(nouvelOnglet);
        setSearchParams({ section: nouvelOnglet });
    };

    /* =====================================================
       ÉTATS
    ===================================================== */

    const [utilisateurs, setUtilisateurs] = useState([]);
    const [prestations, setPrestations] = useState([]);
    const [chapelles, setChapelles] = useState([]);
    const [services, setServices] = useState([]);
    const [historique, setHistorique] = useState([]);
    const [roles, setRoles] = useState([]);
    const [filtreModule, setFiltreModule] = useState("");

    const [loading, setLoading] = useState(false);

    /* --- Modale de confirmation --- */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: "",
        message: "",
        confirmLabel: "Confirmer",
        type: "warning",
        onConfirm: null,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    /* --- Modale de notification --- */
    const [notif, setNotif] = useState({
        open: false,
        type: "success",
        title: "",
        message: "",
    });

    /* --- Formulaires --- */
    const [userForm, setUserForm] = useState({
        name: "",
        password: "",
        password_confirmation: "",
        role: "USER2",
        is_active: true,
    });
    const [editingUserId, setEditingUserId] = useState(null);

    const [prestationForm, setPrestationForm] = useState({
        nom: "",
        prix: "",
    });
    const [editingPrestationId, setEditingPrestationId] = useState(null);

    const [chapelleForm, setChapelleForm] = useState({
        nom: "",
        prix: "",
    });
    const [editingChapelleId, setEditingChapelleId] = useState(null);

    const [nouveauService, setNouveauService] = useState("");

    const [rechercheHistorique, setRechercheHistorique] = useState("");

    /* =====================================================
       HELPERS
    ===================================================== */

    const showNotif = (type, title, message = "") => {
        setNotif({ open: true, type, title, message });
    };

    const closeNotif = () => {
        setNotif((prev) => ({ ...prev, open: false }));
    };

    const openConfirm = (config) => {
        setConfirmConfig({
            title: config.title || "Confirmation",
            message: config.message || "Êtes-vous sûr ?",
            confirmLabel: config.confirmLabel || "Confirmer",
            type: config.type || "warning",
            onConfirm: config.onConfirm,
        });
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        if (confirmLoading) return;
        setConfirmOpen(false);
    };

    const runConfirm = async () => {
        if (!confirmConfig.onConfirm) return;
        try {
            setConfirmLoading(true);
            await confirmConfig.onConfirm();
            setConfirmOpen(false);
        } catch (e) {
            console.error(e);
        } finally {
            setConfirmLoading(false);
        }
    };

    /* =====================================================
       UTILISATEURS
    ===================================================== */

    const messageErreur = (error, defaut) =>
        error?.errors
            ? Object.values(error.errors).flat().join(" ")
            : error?.message || defaut;

    const chargerUtilisateurs = async () => {
        try {
            setUtilisateurs(asList(await api.utilisateurs.list()));
        } catch (error) {
            showNotif("error", "Erreur", messageErreur(error, "Impossible de charger les utilisateurs."));
        }
    };

    const chargerRoles = async () => {
        try {
            setRoles(asList(await api.roles.list()));
        } catch {
            setRoles([]);
        }
    };

    const enregistrerUtilisateur = async (e) => {
        e.preventDefault();

        try {
            if (editingUserId) {
                await api.utilisateurs.update(editingUserId, userForm);
            } else {
                await api.utilisateurs.create(userForm);
            }

            showNotif(
                "success",
                editingUserId ? "Compte modifié" : "Compte créé",
                `Le compte a été ${editingUserId ? "modifié" : "créé"} avec succès.`
            );

            resetUserForm();
            chargerUtilisateurs();
        } catch (error) {
            showNotif("error", "Échec", messageErreur(error, "Erreur lors de l'enregistrement."));
        }
    };

    const modifierUtilisateur = (user) => {
        setEditingUserId(user.id);
        setUserForm({
            name: user.name || "",
            password: "",
            password_confirmation: "",
            role: user.role || "USER2",
            is_active: user.is_active !== false,
        });
    };

    const basculerActivation = (user) => {
        openConfirm({
            title: user.is_active ? "Désactiver le compte ?" : "Réactiver le compte ?",
            message: user.is_active
                ? `Le compte "${user.name}" ne pourra plus se connecter et ses sessions ouvertes seront fermées.`
                : `Le compte "${user.name}" pourra de nouveau se connecter.`,
            confirmLabel: user.is_active ? "Désactiver" : "Réactiver",
            type: "warning",
            onConfirm: async () => {
                try {
                    const data = await api.utilisateurs.toggleActif(user.id);
                    showNotif("success", "Compte mis à jour", data.message);
                    await chargerUtilisateurs();
                } catch (error) {
                    showNotif("error", "Échec", messageErreur(error, "Action impossible."));
                    throw error;
                }
            },
        });
    };

    const demanderSuppressionUtilisateur = (user) => {
        openConfirm({
            title: "Supprimer le compte ?",
            message: `Voulez-vous vraiment supprimer le compte "${user.name}" ?\n\nLe compte est archivé : l'historique de ses actions est conservé.`,
            confirmLabel: "Supprimer",
            type: "danger",
            onConfirm: async () => {
                try {
                    await api.utilisateurs.remove(user.id);

                    showNotif(
                        "success",
                        "Compte supprimé",
                        `Le compte "${user.name}" a été supprimé.`
                    );
                    await chargerUtilisateurs();
                } catch (error) {
                    showNotif("error", "Échec", messageErreur(error, "Impossible de supprimer le compte."));
                    throw error;
                }
            },
        });
    };

    const resetUserForm = () => {
        setEditingUserId(null);
        setUserForm({
            name: "",
            password: "",
            password_confirmation: "",
            role: "USER2",
            is_active: true,
        });
    };

    /* =====================================================
       PRESTATIONS
    ===================================================== */

    const chargerPrestations = async () => {
        try {
            setLoading(true);
            setPrestations(asList(await api.prestations.listAdmin()));
        } catch (error) {
            showNotif("error", "Erreur", messageErreur(error, "Impossible de charger les prestations."));
        } finally {
            setLoading(false);
        }
    };

    const enregistrerPrestation = async (e) => {
        e.preventDefault();

        const donnees = {
            nom: prestationForm.nom,
            prix: Number(prestationForm.prix),
        };

        try {
            if (editingPrestationId) {
                await api.prestations.update(editingPrestationId, donnees);
            } else {
                await api.prestations.create(donnees);
            }

            showNotif(
                "success",
                editingPrestationId ? "Prestation modifiée" : "Prestation ajoutée",
                `La prestation a été ${editingPrestationId ? "modifiée" : "ajoutée"} avec succès.`
            );

            resetPrestationForm();
            chargerPrestations();
        } catch (error) {
            showNotif("error", "Échec", messageErreur(error, "Erreur prestation."));
        }
    };

    const modifierPrestation = (prestation) => {
        setEditingPrestationId(prestation.id);
        setPrestationForm({ nom: prestation.nom, prix: prestation.prix });
    };

    const demanderDesactivationPrestation = (prestation) => {
        openConfirm({
            title: "Désactiver la prestation ?",
            message: `Voulez-vous vraiment désactiver la prestation "${prestation.nom}" ?`,
            confirmLabel: "Désactiver",
            type: "warning",
            onConfirm: async () => {
                try {
                    await api.prestations.remove(prestation.id);

                    showNotif(
                        "success",
                        "Prestation désactivée",
                        `La prestation "${prestation.nom}" a été désactivée.`
                    );
                    await chargerPrestations();
                } catch (error) {
                    showNotif("error", "Échec", messageErreur(error, "Erreur"));
                    throw error;
                }
            },
        });
    };

    const resetPrestationForm = () => {
        setEditingPrestationId(null);
        setPrestationForm({ nom: "", prix: "" });
    };

    /* =====================================================
       CHAPELLES
    ===================================================== */

    const chargerChapelles = async () => {
        try {
            setChapelles(asList(await api.chapelles.listAdmin()));
        } catch (error) {
            showNotif("error", "Erreur", messageErreur(error, "Impossible de charger les chapelles."));
        }
    };

    const enregistrerChapelle = async (e) => {
        e.preventDefault();

        const donnees = {
            nom: chapelleForm.nom,
            prix: Number(chapelleForm.prix),
        };

        try {
            if (editingChapelleId) {
                await api.chapelles.update(editingChapelleId, donnees);
            } else {
                await api.chapelles.create(donnees);
            }

            showNotif(
                "success",
                editingChapelleId ? "Chapelle modifiée" : "Chapelle ajoutée",
                `La chapelle a été ${editingChapelleId ? "modifiée" : "ajoutée"} avec succès.`
            );

            resetChapelleForm();
            chargerChapelles();
        } catch (error) {
            showNotif("error", "Échec", messageErreur(error, "Erreur chapelle."));
        }
    };

    const modifierChapelle = (chapelle) => {
        setEditingChapelleId(chapelle.id);
        setChapelleForm({ nom: chapelle.nom, prix: chapelle.prix });
    };

    const demanderDesactivationChapelle = (chapelle) => {
        openConfirm({
            title: "Désactiver la chapelle ?",
            message: `Voulez-vous vraiment désactiver la chapelle "${chapelle.nom}" ?`,
            confirmLabel: "Désactiver",
            type: "warning",
            onConfirm: async () => {
                try {
                    await api.chapelles.remove(chapelle.id);

                    showNotif(
                        "success",
                        "Chapelle désactivée",
                        `La chapelle "${chapelle.nom}" a été désactivée.`
                    );
                    await chargerChapelles();
                } catch (error) {
                    showNotif("error", "Échec", messageErreur(error, "Erreur"));
                    throw error;
                }
            },
        });
    };

    const resetChapelleForm = () => {
        setEditingChapelleId(null);
        setChapelleForm({ nom: "", prix: "" });
    };

    /* =====================================================
       SERVICES
    ===================================================== */

    const chargerServices = async () => {
        try {
            setServices(asList(await api.services.list()));
        } catch (error) {
            showNotif("error", "Erreur", messageErreur(error, "Impossible de charger les services."));
        }
    };

    const ajouterService = async (e) => {
        e.preventDefault();

        if (!nouveauService.trim()) {
            showNotif("error", "Champ manquant", "Veuillez saisir un nom.");
            return;
        }

        try {
            await api.services.create(nouveauService.trim());

            showNotif(
                "success",
                "Service ajouté",
                `Le service "${nouveauService}" a été ajouté.`
            );

            setNouveauService("");
            chargerServices();
        } catch (error) {
            showNotif("error", "Échec", messageErreur(error, "Erreur ajout service."));
        }
    };

    const supprimerService = (service) => {
        openConfirm({
            title: "Supprimer le service ?",
            message: `Voulez-vous vraiment supprimer le service "${service.nom}" ?`,
            confirmLabel: "Supprimer",
            type: "danger",
            onConfirm: async () => {
                try {
                    await api.services.remove(service.id);

                    showNotif("success", "Service supprimé", `"${service.nom}" supprimé.`);
                    await chargerServices();
                } catch (error) {
                    showNotif("error", "Échec", messageErreur(error, "Impossible de supprimer."));
                    throw error;
                }
            },
        });
    };

    /* =====================================================
       HISTORIQUE
    ===================================================== */

    const chargerHistorique = async () => {
        try {
            const params = {};
            if (rechercheHistorique.trim()) params.recherche = rechercheHistorique.trim();
            if (filtreModule) params.module = filtreModule;

            const data = await api.historique.list(params);
            setHistorique(asList(data));
        } catch (error) {
            showNotif("error", "Erreur", messageErreur(error, "Impossible de charger l'historique."));
        }
    };

    /* =====================================================
       CHARGEMENT INITIAL (selon les permissions)
    ===================================================== */

    useEffect(() => {
        if (hasPermission("utilisateurs.view")) {
            chargerUtilisateurs();
            chargerRoles();
        }
        if (hasPermission("referentiels.manage")) {
            chargerPrestations();
            chargerChapelles();
        }
        chargerServices();
        if (hasPermission("historique.view")) chargerHistorique();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (onglet === "historique" && hasPermission("historique.view")) chargerHistorique();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rechercheHistorique, filtreModule]);

    /* =====================================================
       AFFICHAGE
    ===================================================== */

    return (
        <div className="parametres-page">
            {/* HEADER */}
            <div className="parametres-header">
                <div>
                    <h1>Paramètres</h1>
                </div>
            </div>

            {/* =====================================================
                UTILISATEURS
            ===================================================== */}
            {onglet === "utilisateurs" && (
                <section className="param-section">
                    <div className="section-title">
                        <h2>
                            {editingUserId
                                ? "Modifier un compte"
                                : "Créer un compte"}
                        </h2>
                        {editingUserId && (
                            <button
                                className="secondary-button"
                                onClick={resetUserForm}
                            >
                                Annuler
                            </button>
                        )}
                    </div>

                    <form
                        className="settings-form"
                        onSubmit={enregistrerUtilisateur}
                    >
                        <div className="form-field">
                            <label>Nom du compte</label>
                            <input
                                value={userForm.name}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        name: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Rôle</label>
                            <select
                                value={userForm.role}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        role: e.target.value,
                                    })
                                }
                            >
                                {roles.length === 0 && (
                                    <option value={userForm.role}>
                                        {userForm.role}
                                    </option>
                                )}
                                {roles.map((role) => (
                                    <option key={role.id} value={role.code}>
                                        {role.libelle} ({role.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {editingUserId && (
                            <div className="form-field">
                                <label>Statut</label>
                                <select
                                    value={userForm.is_active ? "1" : "0"}
                                    onChange={(e) =>
                                        setUserForm({
                                            ...userForm,
                                            is_active: e.target.value === "1",
                                        })
                                    }
                                >
                                    <option value="1">Actif</option>
                                    <option value="0">Désactivé</option>
                                </select>
                            </div>
                        )}

                        <div className="form-field">
                            <label>Mot de passe</label>
                            <input
                                type="password"
                                value={userForm.password}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        password: e.target.value,
                                    })
                                }
                                required={!editingUserId}
                                placeholder={
                                    editingUserId
                                        ? "Laisser vide pour conserver"
                                        : ""
                                }
                            />
                        </div>

                        <div className="form-field">
                            <label>Confirmation</label>
                            <input
                                type="password"
                                value={userForm.password_confirmation}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        password_confirmation: e.target.value,
                                    })
                                }
                                required={!editingUserId}
                            />
                        </div>

                        <button className="primary-button" type="submit">
                            {editingUserId
                                ? "Modifier le compte"
                                : "Créer le compte"}
                        </button>
                    </form>

                    <div className="settings-table-wrapper">
                        <table className="settings-table">
                            <thead>
                                <tr>
                                    <th>Compte</th>
                                    <th>Rôle</th>
                                    <th>Statut</th>
                                    <th>Dernière connexion</th>
                                    <th>Créé le / par</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {utilisateurs.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>
                                            <span
                                                className={`role-badge role-${String(
                                                    user.role
                                                ).toLowerCase()}`}
                                            >
                                                {user.role_libelle || user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`status-pill ${
                                                    user.is_active ? "status-on" : "status-off"
                                                }`}
                                            >
                                                {user.is_active ? "Actif" : "Désactivé"}
                                            </span>
                                        </td>
                                        <td>
                                            {user.last_login_at
                                                ? new Date(user.last_login_at).toLocaleString("fr-FR")
                                                : "Jamais"}
                                        </td>
                                        <td>
                                            {new Date(
                                                user.created_at
                                            ).toLocaleString("fr-FR")}
                                            <div className="trace-by">
                                                par {user.createur?.name || "—"}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="action-edit"
                                                onClick={() =>
                                                    modifierUtilisateur(user)
                                                }
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                className="action-edit"
                                                onClick={() =>
                                                    basculerActivation(user)
                                                }
                                            >
                                                {user.is_active ? "Désactiver" : "Réactiver"}
                                            </button>
                                            <button
                                                className="action-delete"
                                                onClick={() =>
                                                    demanderSuppressionUtilisateur(
                                                        user
                                                    )
                                                }
                                            >
                                                Supprimer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* =====================================================
                PRESTATIONS
            ===================================================== */}
            {onglet === "prestations" && (
                <section className="param-section">
                    <div className="section-title">
                        <h2>
                            {editingPrestationId
                                ? "Modifier la prestation"
                                : "Ajouter une prestation"}
                        </h2>
                        {editingPrestationId && (
                            <button
                                className="secondary-button"
                                onClick={resetPrestationForm}
                            >
                                Annuler
                            </button>
                        )}
                    </div>

                    <form
                        className="settings-form two-columns"
                        onSubmit={enregistrerPrestation}
                    >
                        <div className="form-field">
                            <label>Nom de la prestation</label>
                            <input
                                value={prestationForm.nom}
                                onChange={(e) =>
                                    setPrestationForm({
                                        ...prestationForm,
                                        nom: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Prix</label>
                            <input
                                type="number"
                                min="0"
                                value={prestationForm.prix}
                                onChange={(e) =>
                                    setPrestationForm({
                                        ...prestationForm,
                                        prix: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <button className="primary-button" type="submit">
                            {editingPrestationId ? "Modifier" : "Ajouter"}
                        </button>
                    </form>

                    <div className="settings-table-wrapper">
                        <table className="settings-table">
                            <thead>
                                <tr>
                                    <th>Prestation</th>
                                    <th>Prix</th>
                                    <th>État</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prestations.map((prestation) => (
                                    <tr key={prestation.id}>
                                        <td>{prestation.nom}</td>
                                        <td>
                                            {Number(
                                                prestation.prix
                                            ).toLocaleString("fr-FR")}{" "}
                                            FCFA
                                        </td>
                                        <td>
                                            {prestation.actif
                                                ? "ACTIVE"
                                                : "INACTIVE"}
                                        </td>
                                        <td>
                                            <button
                                                className="action-edit"
                                                onClick={() =>
                                                    modifierPrestation(
                                                        prestation
                                                    )
                                                }
                                            >
                                                Modifier
                                            </button>
                                            {prestation.actif && (
                                                <button
                                                    className="action-delete"
                                                    onClick={() =>
                                                        demanderDesactivationPrestation(
                                                            prestation
                                                        )
                                                    }
                                                >
                                                    Désactiver
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* =====================================================
                CHAPELLES
            ===================================================== */}
            {onglet === "chapelles" && (
                <section className="param-section">
                    <div className="section-title">
                        <h2>
                            {editingChapelleId
                                ? "Modifier la chapelle"
                                : "Ajouter une chapelle"}
                        </h2>
                        {editingChapelleId && (
                            <button
                                className="secondary-button"
                                onClick={resetChapelleForm}
                            >
                                Annuler
                            </button>
                        )}
                    </div>

                    <form
                        className="settings-form two-columns"
                        onSubmit={enregistrerChapelle}
                    >
                        <div className="form-field">
                            <label>Nom de la chapelle</label>
                            <input
                                value={chapelleForm.nom}
                                onChange={(e) =>
                                    setChapelleForm({
                                        ...chapelleForm,
                                        nom: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Prix</label>
                            <input
                                type="number"
                                min="0"
                                value={chapelleForm.prix}
                                onChange={(e) =>
                                    setChapelleForm({
                                        ...chapelleForm,
                                        prix: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <button className="primary-button" type="submit">
                            {editingChapelleId ? "Modifier" : "Ajouter"}
                        </button>
                    </form>

                    <div className="settings-table-wrapper">
                        <table className="settings-table">
                            <thead>
                                <tr>
                                    <th>Chapelle</th>
                                    <th>Prix</th>
                                    <th>État</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chapelles.map((chapelle) => (
                                    <tr key={chapelle.id}>
                                        <td>{chapelle.nom}</td>
                                        <td>
                                            {Number(
                                                chapelle.prix
                                            ).toLocaleString("fr-FR")}{" "}
                                            FCFA
                                        </td>
                                        <td>
                                            {chapelle.actif
                                                ? "ACTIVE"
                                                : "INACTIVE"}
                                        </td>
                                        <td>
                                            <button
                                                className="action-edit"
                                                onClick={() =>
                                                    modifierChapelle(chapelle)
                                                }
                                            >
                                                Modifier
                                            </button>
                                            {chapelle.actif && (
                                                <button
                                                    className="action-delete"
                                                    onClick={() =>
                                                        demanderDesactivationChapelle(
                                                            chapelle
                                                        )
                                                    }
                                                >
                                                    Désactiver
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* =====================================================
                SERVICES
            ===================================================== */}
            {onglet === "services" && (
                <section className="param-section">
                    <div className="section-title">
                        <h2>Services d'origine</h2>
                    </div>

                    <form
                        className="settings-form two-columns"
                        onSubmit={ajouterService}
                    >
                        <div className="form-field">
                            <label>Nom du service</label>
                            <input
                                value={nouveauService}
                                onChange={(e) =>
                                    setNouveauService(e.target.value)
                                }
                                placeholder="Ex: Urgences, Chirurgie..."
                                required
                            />
                        </div>

                        <button className="primary-button" type="submit">
                            Ajouter
                        </button>
                    </form>

                    <div className="settings-table-wrapper">
                        <table className="settings-table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map((service) => (
                                    <tr key={service.id}>
                                        <td>🏥 {service.nom}</td>
                                        <td>
                                            <button
                                                className="action-delete"
                                                onClick={() =>
                                                    supprimerService(service)
                                                }
                                            >
                                                Supprimer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {services.length === 0 && (
                                    <tr>
                                        <td colSpan="2" style={{ textAlign: "center", padding: "20px" }}>
                                            Aucun service enregistré.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* =====================================================
                HISTORIQUE
            ===================================================== */}
            {onglet === "historique" && (
                <section className="param-section">
                    <div className="section-title">
                        <div>
                            <h2>Historique</h2>
                        </div>
                    </div>

                    <div className="history-search">
                        <input
                            type="text"
                            placeholder="Rechercher une action, un compte ou une description..."
                            value={rechercheHistorique}
                            onChange={(e) =>
                                setRechercheHistorique(e.target.value)
                            }
                        />
                        <select
                            value={filtreModule}
                            onChange={(e) => setFiltreModule(e.target.value)}
                        >
                            <option value="">Tous les modules</option>
                            {[
                                "AUTHENTIFICATION", "UTILISATEURS", "ROLES", "DEPOTS",
                                "SORTIES", "TRANSFERTS", "LEVEES", "DECLARATIONS",
                                "PRESTATIONS", "CHAPELLES", "SERVICES", "PROFESSIONS",
                            ].map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div className="settings-table-wrapper">
                        <table className="settings-table">
                            <thead>
                                <tr>
                                    <th>Date / heure</th>
                                    <th>Utilisateur</th>
                                    <th>Module</th>
                                    <th>Action</th>
                                    <th>Description</th>
                                    <th>Détails</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historique.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            {new Date(
                                                log.created_at
                                            ).toLocaleString("fr-FR")}
                                        </td>
                                        <td>
                                            {log.user?.name || "Système"}
                                        </td>
                                        <td>{log.module}</td>
                                        <td>
                                            <span className="action-badge">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>{log.description}</td>
                                        <td>
                                            <DetailsAudit details={log.details} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* =====================================================
                CORBEILLE
            ===================================================== */}
            {onglet === "corbeille" && <Corbeille />}

            {/* =====================================================
                RÔLES & PERMISSIONS
            ===================================================== */}
            {onglet === "roles" && (
                <RolesPermissions
                    onChange={chargerRoles}
                    showNotif={showNotif}
                    openConfirm={openConfirm}
                />
            )}

            {/* =====================================================
                MODALE CONFIRMATION
            ===================================================== */}
            <ConfirmDialog
                open={confirmOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmLabel={confirmConfig.confirmLabel}
                cancelLabel="Annuler"
                type={confirmConfig.type}
                loading={confirmLoading}
                onConfirm={runConfirm}
                onCancel={closeConfirm}
            />

            {/* =====================================================
                MODALE NOTIFICATION
            ===================================================== */}
            <NotificationBox
                open={notif.open}
                type={notif.type}
                title={notif.title}
                message={notif.message}
                duration={2000}
                onClose={closeNotif}
            />
        </div>
    );
}

/* Affiche les champs modifiés (avant → après) d'une entrée du journal. */
function DetailsAudit({ details }) {
    if (!details) return <span className="trace-by">—</span>;

    const { avant = {}, apres = {} } = details;
    const champs = Object.keys(apres).length ? Object.keys(apres) : Object.keys(avant);

    if (!details.avant && !details.apres) {
        return (
            <details>
                <summary>Voir</summary>
                <pre className="audit-json">{JSON.stringify(details, null, 2)}</pre>
            </details>
        );
    }

    return (
        <details>
            <summary>{champs.length} champ(s)</summary>
            <ul className="audit-diff">
                {champs.map((champ) => (
                    <li key={champ}>
                        <strong>{champ}</strong> :{" "}
                        {details.avant && (
                            <>
                                <del>{formatValeur(avant[champ])}</del> →{" "}
                            </>
                        )}
                        <ins>{formatValeur(apres[champ])}</ins>
                    </li>
                ))}
            </ul>
        </details>
    );
}

function formatValeur(v) {
    if (v === null || v === undefined || v === "") return "∅";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

export default Parametres;