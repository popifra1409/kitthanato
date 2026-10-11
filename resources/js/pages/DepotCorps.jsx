import React, { useEffect, useState } from "react";
import "./DepotCorps.css";
import ConfirmDialog from "../components/ConfirmDialog";
import NotificationBox from "../components/NotificationBox";

import api, { asList } from "../services/api";
import { hasPermission } from "../services/session";

/* =========================================================
   CALCUL DU PRÉFIXE ANNÉE
========================================================= */
const getPrefixeAnnee = () => {
    const annee = new Date().getFullYear();
    const court = String(annee).slice(-2);   // "26", "27", "30"
    return `${court}PA`;
};

const PREFIXE_ANNEE = getPrefixeAnnee();

function DepotCorps() {
    // =========================================================
    // ÉTATS
    // =========================================================

    const [depots, setDepots] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const [selectedDepot, setSelectedDepot] = useState(null);
    const [editingId, setEditingId] = useState(null);

    /* ---------- Confirmation ---------- */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: "",
        message: "",
        confirmLabel: "Confirmer",
        type: "warning",
        onConfirm: null,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    /* ---------- Notification ---------- */
    const [notif, setNotif] = useState({
        open: false,
        type: "success",
        title: "",
        message: "",
    });
//action 
const [openMenuId, setOpenMenuId] = useState(null);
    // Professions
    const [professions, setProfessions] = useState([]);
    const [professionRecherchee, setProfessionRecherchee] = useState("");
    const [afficherProfessions, setAfficherProfessions] = useState(false);

    // Prestations
    const [prestations, setPrestations] = useState([]);
    const [prestationsSelectionnees, setPrestationsSelectionnees] = useState([]);
    const [montantPrestations, setMontantPrestations] = useState(0);
    const [loadingPrestations, setLoadingPrestations] = useState(true);
//service
// Services d'origine
const [services, setServices] = useState([]);
const [serviceRecherche, setServiceRecherche] = useState("");
const [afficherServices, setAfficherServices] = useState(false);
    // =========================================================
    // FORMULAIRE
    // =========================================================

    const initialForm = {
        code: "",
        code_defunt: "",

        nom: "",
        prenom: "",
        sexe: "",

        date_naissance: "",
        age: "",

        profession: "",

        date_deces: "",
        heure_deces: "",

        date_arrivee: "",
        heure_arrivee: "",

        date_sortie: "",

        provenance: "",
        service_origine: "",
        lieu_provenance: "",
        motif: "",

        etat: "",
        emplacement: "",
        chapelle: "",

        contact_nom: "",
        contact_telephone: "",
        contact_cni: "",
        lien_parente: "",
    };

    const [formData, setFormData] = useState(initialForm);

    // =========================================================
    // HELPERS MODALES
    // =========================================================

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

    // =========================================================
    // FORMAT DATE
    // =========================================================

    const formatDateForInput = (date) => {
        if (!date) return "";

        const value = String(date);

        if (value.includes("T")) return value.split("T")[0];
        if (value.includes(" ")) return value.split(" ")[0];

        return value;
    };

    // =========================================================
    // CHARGER LES DEPOTS
    // =========================================================

    const fetchDepots = async () => {
        try {
            setLoading(true);

            const data = await api.depots.list();
            setDepots(asList(data, "depots"));
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Erreur",
                error.message || "Impossible de charger les dépôts."
            );
            setDepots([]);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // PROFESSIONS
    // =========================================================

    const chargerProfessions = async (recherche = "") => {
        try {
            const data = asList(await api.professions.list(recherche), "professions");

            setProfessions(data);
        } catch (error) {
            console.error(error);
            setProfessions([]);
        }
    };
// // =========================================================
// SERVICES D'ORIGINE
// =========================================================

const chargerServices = async (recherche = "") => {
    try {
        const data = asList(await api.services.list(recherche), "services");

        setServices(data);
    } catch (error) {
        console.error("Erreur de chargement des services :", error);
        setServices([]);
    }
};

const selectionnerService = (service) => {
    const nom = service.nom || "";

    setFormData((prev) => ({
        ...prev,
        service_origine: nom,
    }));

    setServiceRecherche(nom);
    setAfficherServices(false);
};

const ajouterService = async () => {
    const nom = serviceRecherche.trim();

    if (!nom) {
        showNotif(
            "error",
            "Champ manquant",
            "Veuillez saisir le nom du service."
        );
        return;
    }

    try {
        const cree = await api.services.create(nom);

        const nouveauService = cree?.nom || nom;

        setFormData((prev) => ({
            ...prev,
            service_origine: nouveauService,
        }));

        setServiceRecherche(nouveauService);
        setAfficherServices(false);

        await chargerServices();

    } catch (error) {
        console.error(error);

        showNotif(
            "error",
            "Échec",
            error.firstMessage ||
                "Impossible d'ajouter le service."
        );
    }
};

    // =========================================================
    // PRESTATIONS
    // =========================================================

    const fetchPrestations = async () => {
        try {
            setLoadingPrestations(true);

            const data = asList(await api.prestations.list(), "prestations");

            setPrestations(data);
        } catch (error) {
            console.error(error);
            setPrestations([]);
            
        } finally {
            setLoadingPrestations(false);
        }
    };

    // =========================================================
    // CHARGEMENT INITIAL
    // =========================================================

    useEffect(() => {
        fetchDepots();
        chargerProfessions();
        chargerServices();
        fetchPrestations();
    }, []);

    // =========================================================
    // action
    // =========================================================

    useEffect(() => {
    const fermerMenu = () => setOpenMenuId(null);
    document.addEventListener("click", fermerMenu);
    return () => document.removeEventListener("click", fermerMenu);
}, []);

    // =========================================================
    // CALCUL TOTAL PRESTATIONS
    // =========================================================

    useEffect(() => {
        const total = prestations
            .filter((prestation) =>
                prestationsSelectionnees.includes(Number(prestation.id))
            )
            .reduce(
                (somme, prestation) =>
                    somme + Number(prestation.prix || 0),
                0
            );

        setMontantPrestations(total);
    }, [prestations, prestationsSelectionnees]);

    // =========================================================
    // CHANGEMENT FORMULAIRE
    // =========================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "date_naissance") {
            let age = "";

            if (value) {
                const naissance = new Date(`${value}T00:00:00`);
                const aujourdHui = new Date();

                age = aujourdHui.getFullYear() - naissance.getFullYear();

                const mois = aujourdHui.getMonth() - naissance.getMonth();

                if (
                    mois < 0 ||
                    (mois === 0 &&
                        aujourdHui.getDate() < naissance.getDate())
                ) {
                    age--;
                }

                if (age < 0) age = "";
            }

            setFormData((prev) => ({
                ...prev,
                date_naissance: value,
                age,
            }));

            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // =========================================================
    // PROFESSION
    // =========================================================

    const selectionnerProfession = (profession) => {
        const nom = profession.nom || "";

        setFormData((prev) => ({
            ...prev,
            profession: nom,
        }));

        setProfessionRecherchee(nom);
        setAfficherProfessions(false);
    };

    const ajouterProfession = async () => {
        const nom = professionRecherchee.trim();

        if (!nom) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez saisir une profession."
            );
            return;
        }

        try {
            const creee = await api.professions.create(nom);

            const nouvelleProfession = creee?.nom || nom;

            setFormData((prev) => ({
                ...prev,
                profession: nouvelleProfession,
            }));

            setProfessionRecherchee(nouvelleProfession);
            setAfficherProfessions(false);

            await chargerProfessions();

        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage ||
                    "Impossible d'ajouter la profession."
            );
        }
    };

    // =========================================================
    // PRESTATIONS
    // =========================================================

    const handlePrestationChange = (id) => {
        const numericId = Number(id);

        setPrestationsSelectionnees((prev) => {
            if (prev.includes(numericId)) {
                return prev.filter((item) => item !== numericId);
            }

            return [...prev, numericId];
        });
    };

    // =========================================================
    // NOUVEAU DEPOT
    // =========================================================

    const openNewForm = () => {
        setEditingId(null);
        setFormData({ ...initialForm });

        setProfessionRecherchee("");
        setAfficherProfessions(false);
        setServiceRecherche("");
        setAfficherServices(false);
        setPrestationsSelectionnees([]);

        setShowForm(true);
    };

    // =========================================================
    // FERMER FORMULAIRE
    // =========================================================

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);

        setFormData({ ...initialForm });

        setProfessionRecherchee("");
        setAfficherProfessions(false);
        setServiceRecherche("");
        setAfficherServices(false);
        setPrestationsSelectionnees([]);
    };

    // =========================================================
    // MODIFIER
    // =========================================================

    const editDepot = (depot) => {
        setEditingId(depot.id);

        const selectedPrestations = Array.isArray(depot.prestations)
            ? depot.prestations.map((p) => Number(p.id ?? p)).filter(Boolean)
            : [];

        setPrestationsSelectionnees(selectedPrestations);
        setProfessionRecherchee(depot.profession || "");
setServiceRecherche(depot.service_origine || "");
setAfficherServices(false);
        setFormData({
code: (depot.code || "").replace(/^\d{2}PA/, ""),            code_defunt: depot.code_defunt || "",

            nom: depot.nom || "",
            prenom: depot.prenom || "",
            sexe: depot.sexe || "",

            date_naissance: formatDateForInput(depot.date_naissance),
            age: depot.age ?? "",
            profession: depot.profession || "",

            date_deces: formatDateForInput(depot.date_deces),
            heure_deces: depot.heure_deces
                ? String(depot.heure_deces).substring(0, 5)
                : "",

            date_arrivee: formatDateForInput(depot.date_arrivee),
            heure_arrivee: depot.heure_arrivee
                ? String(depot.heure_arrivee).substring(0, 5)
                : "",

            date_sortie: formatDateForInput(depot.date_sortie),

            provenance: depot.provenance || "",
            service_origine: depot.service_origine || "",
            lieu_provenance: depot.lieu_provenance || "",
            motif: depot.motif || "",

            etat: depot.etat || "",
            emplacement: depot.emplacement || "",
            chapelle: depot.chapelle || "",

            contact_nom: depot.contact_nom || "",
            contact_telephone: depot.contact_telephone || "",
            contact_cni: depot.contact_cni || "",
            lien_parente: depot.lien_parente || "",
        });

        setShowForm(true);
    };

    // =========================================================
    // ENREGISTRER
    // =========================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.date_naissance && !formData.age) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez renseigner la date de naissance ou l'âge."
            );
            return;
        }

        if (!formData.provenance) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner la provenance."
            );
            return;
        }

        if (
            formData.provenance === "Interne" &&
            !formData.service_origine
        ) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner le service d'origine."
            );
            return;
        }

        if (
            formData.provenance === "Externe" &&
            !formData.lieu_provenance
        ) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez renseigner le lieu de provenance."
            );
            return;
        }

        try {
            const donnees = {
                ...formData,

code: `${PREFIXE_ANNEE}${formData.code}`,
                motif: formData.motif || "Non précisé",
                etat: formData.etat || "Non précisé",
                chapelle: formData.chapelle || "Aucune",

                age: formData.age ? Number(formData.age) : null,

                date_naissance: formData.date_naissance || null,
                date_deces: formData.date_deces || null,
                heure_deces: formData.heure_deces || null,
                date_arrivee: formData.date_arrivee || null,
                heure_arrivee: formData.heure_arrivee || null,
                date_sortie: formData.date_sortie || null,

                service_origine:
                    formData.provenance === "Interne"
                        ? formData.service_origine
                        : null,

                lieu_provenance:
                    formData.provenance === "Externe"
                        ? formData.lieu_provenance
                        : null,

                prestations: prestationsSelectionnees,
                montant_prestations: montantPrestations,
            };

            if (editingId) {
                await api.depots.update(editingId, donnees);
            } else {
                await api.depots.create(donnees);
            }

            showNotif(
                "success",
                editingId ? "Dépôt modifié" : "Dépôt enregistré",
                editingId
                    ? "Les modifications ont été enregistrées avec succès."
                    : "Le dépôt a été enregistré avec succès."
            );

            closeForm();
            await fetchDepots();
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage || error.message || "Impossible d'enregistrer le dépôt."
            );
        }
    };

    // =========================================================
    // SUPPRESSION
    // =========================================================

    const demanderSuppression = (depot) => {
    openConfirm({
        title: "Supprimer le dépôt ?",
        message: `Le défunt "${depot.nom || ""} ${
            depot.prenom || ""
        }" sera définitivement supprimé.\n\nCette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "danger",
        onConfirm: async () => {
            try {
                await api.depots.remove(depot.id);

                showNotif(
                    "success",
                    "Dépôt supprimé",
                    "Le dépôt a été supprimé avec succès."
                );

                if (selectedDepot?.id === depot.id) {
                    setShowDetails(false);
                    setSelectedDepot(null);
                }

                await fetchDepots();
            } catch (error) {
                console.error(error);
                showNotif(
                    "error",
                    "Échec",
                    error.message || "Erreur lors de la suppression."
                );
                throw error;
            }
        },
    });
};

    // =========================================================
    // RECHERCHE
    // =========================================================

    const depotsFiltres = depots.filter((depot) => {
        const recherche = search.toLowerCase().trim();

        if (!recherche) return true;

        const texte = [
            depot.code,
            depot.code_defunt,
            depot.nom,
            depot.prenom,
            depot.provenance,
            depot.service_origine,
            depot.lieu_provenance,
            depot.emplacement,
            depot.chapelle,
            depot.contact_nom,
            depot.statut,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return texte.includes(recherche);
    });

    // =========================================================
    // DATES MIN / MAX
    // =========================================================

    const aujourdHui = new Date();
    aujourdHui.setMinutes(
        aujourdHui.getMinutes() - aujourdHui.getTimezoneOffset()
    );

    const maxDate = aujourdHui.toISOString().split("T")[0];
    const minDate = maxDate;

    // =========================================================
    // AFFICHAGE
    // =========================================================

    return (
        <div className="depot-page">
            {/* HEADER */}
            <div className="depot-header">
                <div className="depot-title-line">
                    <h1> Dépôt des corps</h1>

                    <div className="depot-total">
                        {depots.length} dépôt
                        {depots.length !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>

            {/* OUTILS */}
            <div className="depot-toolbar">
                <div className="search-container">
                    <span className="search-icon">🔍</span>

                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par code, nom, provenance..."
                    />

                    {search && (
                        <button
                            type="button"
                            className="clear-search"
                            onClick={() => setSearch("")}
                        >
                            ×
                        </button>
                    )}
                </div>

                {hasPermission("depots.create") && (
                    <button
                        type="button"
                        className="new-depot-button"
                        onClick={openNewForm}
                    >
                        Nouveau dépôt
                    </button>
                )}
            </div>

            {/* TABLEAU */}
            <div className="depot-table-card">
                
                <div className="table-wrapper">
                    <table className="depot-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Code défunt</th>
                                <th>Nom du défunt</th>
                                <th>Date décès</th>
                                <th>Provenance</th>
                                <th>État</th>
                                <th>Emplacement</th>
                                <th>Chapelle</th>
                                <th>Déposant</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="11"
                                        className="table-loading"
                                    >
                                        Chargement des dépôts...
                                    </td>
                                </tr>
                            ) : depotsFiltres.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="11"
                                        className="table-empty"
                                    >
                                        Aucun dépôt trouvé.
                                    </td>
                                </tr>
                            ) : (
                                depotsFiltres.map((depot) => (
                                    <tr key={depot.id}>
                                        <td>
                                            <span className="code-badge">
                                                {depot.code || "-"}
                                            </span>
                                        </td>

                                        <td>{depot.code_defunt || "-"}</td>

                                        <td className="defunt-cell">
                                            <strong>
                                                {depot.nom} {depot.prenom}
                                            </strong>
                                            <span>{depot.sexe || ""}</span>
                                        </td>

                                        <td className="date-cell">
                                            {depot.date_deces
                                                ? formatDateForInput(
                                                      depot.date_deces
                                                  )
                                                : "-"}
                                        </td>

                                        <td className="provenance-cell">
                                            <span className="provenance-main">
                                                {depot.provenance || "-"}
                                            </span>
                                            <span className="provenance-detail">
                                                {depot.service_origine ||
                                                    depot.lieu_provenance ||
                                                    ""}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="etat-badge">
                                                {depot.etat || "-"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="emplacement-badge">
                                                {depot.emplacement || "-"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="chapelle-badge">
                                                {depot.chapelle || "-"}
                                            </span>
                                        </td>

                                        <td className="deposant-cell">
                                            {depot.contact_nom || "-"}
                                            <br />
                                            <span>{depot.contact_telephone || ""}</span>
                                            <br />
                                         <span>CNI : {depot.contact_cni || ""}</span>
                                        </td>

                                        <td>
                                            <span className="depot-status status-present">
                                                {depot.statut || "PRÉSENT"}
                                            </span>
                                        </td>

                                        <td>
    <div className="actions-menu-container">
        <button
            type="button"
            className="actions-menu-trigger"
            onClick={(e) => {
                e.stopPropagation();   // empêche la fermeture immédiate
                setOpenMenuId(openMenuId === depot.id ? null : depot.id);
            }}
        >
            ⋮
        </button>

        {openMenuId === depot.id && (
            <div
                className="actions-menu-dropdown"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="actions-menu-item view"
                    onClick={() => {
                        setSelectedDepot(depot);
                        setShowDetails(true);
                        setOpenMenuId(null);
                    }}
                >
                    👁 Voir les détails
                </button>

                {hasPermission("depots.update") && (
                    <button
                        type="button"
                        className="actions-menu-item edit"
                        onClick={() => {
                            editDepot(depot);
                            setOpenMenuId(null);
                        }}
                    >
                        ✏ Modifier
                    </button>
                )}

                {hasPermission("depots.delete") && (
                    <button
                        type="button"
                        className="actions-menu-item delete"
                        onClick={() => {
                            demanderSuppression(depot);
                            setOpenMenuId(null);
                        }}
                    >
                        🗑 Supprimer
                    </button>
                )}
            </div>
        )}
    </div>
</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer">
                    {depotsFiltres.length} résultat
                    {depotsFiltres.length !== 1 ? "s" : ""}
                </div>
            </div>

            {/* =====================================================
                FORMULAIRE
            ===================================================== */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="depot-modal">
                        <div className="modal-header">
                            <h2>
                                {editingId
                                    ? "Modifier le dépôt"
                                    : "Nouveau dépôt"}
                            </h2>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeForm}
                            >
                                ×
                            </button>
                        </div>

                        <form className="depot-form" onSubmit={handleSubmit}>
                            {/* 01 */}
                            <div className="form-section">
                                <div className="section-heading">
                                    01 — Identification du défunt
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Code du dépôt *</label>

                                        <div className="code-input">
                                            <span>{PREFIXE_ANNEE}</span>
    <input
        type="text"
        name="code"
        value={formData.code}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        code: e.target.value.replace(
                                                            /\D/g,
                                                            ""
                                                        ),
                                                    }))
                                                }
                                                placeholder="00001"
                                                maxLength="7"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Code du défunt</label>
                                        <input
                                            type="text"
                                            name="code_defunt"
                                            value={formData.code_defunt}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Nom *</label>
                                        <input
                                            type="text"
                                            name="nom"
                                            value={formData.nom}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Prénom</label>
                                        <input
                                            type="text"
                                            name="prenom"
                                            value={formData.prenom}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Sexe *</label>
                                        <select
                                            name="sexe"
                                            value={formData.sexe}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">
                                                Sélectionner
                                            </option>
                                            <option value="Masculin">
                                                Masculin
                                            </option>
                                            <option value="Féminin">
                                                Féminin
                                            </option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Profession</label>

                                        <div className="profession-container">
                                            <input
                                                type="text"
                                                value={professionRecherchee}
                                                onChange={(e) => {
                                                    const valeur =
                                                        e.target.value;

                                                    setProfessionRecherchee(
                                                        valeur
                                                    );

                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        profession: valeur,
                                                    }));

                                                    setAfficherProfessions(true);
                                                    chargerProfessions(valeur);
                                                }}
                                                onFocus={() => {
                                                    setAfficherProfessions(
                                                        true
                                                    );
                                                    chargerProfessions(
                                                        professionRecherchee
                                                    );
                                                }}
                                                autoComplete="off"
                                                placeholder="Rechercher..."
                                            />

                                            {afficherProfessions && (
                                                <div className="profession-suggestions">
                                                    {professions.map(
                                                        (profession) => (
                                                            <button
                                                                type="button"
                                                                key={
                                                                    profession.id
                                                                }
                                                                className="profession-option"
                                                                onClick={() =>
                                                                    selectionnerProfession(
                                                                        profession
                                                                    )
                                                                }
                                                            >
                                                                {profession.nom}
                                                            </button>
                                                        )
                                                    )}

                                                    {professionRecherchee.trim() && (
                                                        <div
                                                            className="profession-ajouter"
                                                            onClick={
                                                                ajouterProfession
                                                            }
                                                        >
                                                            Ajouter "
                                                            {professionRecherchee}
                                                            "
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Date de naissance</label>
                                        <input
                                            type="date"
                                            name="date_naissance"
                                            value={formData.date_naissance}
                                            max={maxDate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Âge</label>
                                        <input
                                            type="number"
                                            name="age"
                                            value={formData.age}
                                            disabled={Boolean(
                                                formData.date_naissance
                                            )}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 02 */}
                            <div className="form-section">
                                <div className="section-heading">
                                    02 — Décès et arrivée
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Date du décès *</label>
                                        <input
                                            type="date"
                                            name="date_deces"
                                            value={formData.date_deces}
                                            max={maxDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Heure du décès</label>
                                        <input
                                            type="time"
                                            name="heure_deces"
                                            value={formData.heure_deces}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Date d'arrivée *</label>
                                        <input
                                            type="date"
                                            name="date_arrivee"
                                            value={formData.date_arrivee}
                                            onChange={handleChange}
                                            min={
                                                formData.date_deces ||
                                                undefined
                                            }
                                            max={maxDate}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Heure d'arrivée</label>
                                        <input
                                            type="time"
                                            name="heure_arrivee"
                                            value={formData.heure_arrivee}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Date de sortie prévue</label>
                                        <input
                                            type="date"
                                            name="date_sortie"
                                            value={formData.date_sortie}
                                            onChange={handleChange}
                                            min={minDate}
                                            max="2099-12-31"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Motif</label>
                                        <select
                                            name="motif"
                                            value={formData.motif}
                                            onChange={handleChange}
                                        >
                                            <option value="">
                                                Sélectionner
                                            </option>
                                            <option value="Décès">
                                                Décès
                                            </option>
                                            <option value="Conservation">
                                                Conservation
                                            </option>
                                            <option value="Préparation">
                                                Préparation
                                            </option>
                                            <option value="Transfert">
                                                Transfert
                                            </option>
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* 03 */}
                            <div className="form-section">
                                <div className="section-heading">
                                    03 — Provenance et emplacement
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Provenance *</label>
                                        <select
                                            name="provenance"
                                            value={formData.provenance}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">
                                                Sélectionner
                                            </option>
                                            <option value="Interne">
                                                Interne
                                            </option>
                                            <option value="Externe">
                                                Externe
                                            </option>
                                        </select>
                                    </div>



                                   {formData.provenance === "Interne" && (
    <div className="form-group">
        <label>Service d'origine *</label>

        <div className="profession-container">
            <input
                type="text"
                name="service_origine"
                value={serviceRecherche}
                onChange={(e) => {
                    const valeur = e.target.value;

                    setServiceRecherche(valeur);

                    setFormData((prev) => ({
                        ...prev,
                        service_origine: valeur,
                    }));

                    setAfficherServices(true);
                    chargerServices(valeur);
                }}
                onFocus={() => {
                    setAfficherServices(true);
                    chargerServices(serviceRecherche);
                }}
                autoComplete="off"
                placeholder="Rechercher ou saisir un service..."
                required
            />

            {afficherServices && (
                <div className="profession-suggestions">
                    {services.map((service) => (
                        <button
                            type="button"
                            key={service.id}
                            className="profession-option"
                            onClick={() =>
                                selectionnerService(service)
                            }
                        >
                            {service.nom}
                        </button>
                    ))}

                    {serviceRecherche.trim() && (
                        <button
                            type="button"
                            className="profession-ajouter"
                            onClick={ajouterService}
                        >
                            Ajouter « {serviceRecherche.trim()} »
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
)}
                                    {formData.provenance === "Externe" && (
                                        <div className="form-group">
                                            <label>
                                                Lieu de provenance *
                                            </label>
                                            <input
                                                type="text"
                                                name="lieu_provenance"
                                                value={
                                                    formData.lieu_provenance
                                                }
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>État du corps *</label>
                                        <select
                                            name="etat"
                                            value={formData.etat}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">
                                                Sélectionner
                                            </option>
                                            <option value="Bon état">
                                                Bon état
                                            </option>
                                            <option value="État moyen">
                                                État moyen
                                            </option>
                                            <option value="Dégradé">
                                                Dégradé
                                            </option>
                                            <option value="Altéré">
                                                Altéré
                                            </option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Emplacement *</label>
                                        <select
                                            name="emplacement"
                                            value={formData.emplacement}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">
                                                Sélectionner
                                            </option>
                                            <option value="Chambre froide individuelle">
                                                Chambre froide individuelle
                                            </option>
                                            <option value="Chambre froide commune">
                                                Chambre froide commune
                                            </option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Chapelle</label>
                                        <select
                                            name="chapelle"
                                            value={formData.chapelle}
                                            onChange={handleChange}
                                        >
                                            <option value="">Aucune</option>
                                            <option value="Petite chapelle">
                                                Petite chapelle
                                            </option>
                                            <option value="Grande chapelle">
                                                Grande chapelle
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* 04 */}
                            <div className="form-section">
                                <div className="section-heading">
                                    04 — Déposant et contact
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Nom du déposant *</label>
                                        <input
                                            type="text"
                                            name="contact_nom"
                                            value={formData.contact_nom}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Téléphone</label>
                                        <input
                                            type="tel"
                                            name="contact_telephone"
                                            value={formData.contact_telephone}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
    <label>CNI du déposant</label>
    <input
        type="text"
        name="contact_cni"
        value={formData.contact_cni}
        onChange={handleChange}
        placeholder="Numéro CNI"
        required
    />
</div>

                                    <div className="form-group">
                                        <label>Lien de parenté</label>
                                        <select
                                            name="lien_parente"
                                            value={formData.lien_parente}
                                            onChange={handleChange}
                                        >
                                            <option value="">
                                                Sélectionner
                                            </option>
                                            <option value="Père">Père</option>
                                            <option value="Mère">Mère</option>
                                            <option value="Époux(se)">
                                                Époux(se)
                                            </option>
                                            <option value="Fils">Fils</option>
                                            <option value="Fille">Fille</option>
                                            <option value="Frère">Frère</option>
                                            <option value="Sœur">Sœur</option>
                                            <option value="Oncle">Oncle</option>
                                            <option value="Tante">Tante</option>
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                                 

                            {/* BOUTONS */}
                            <div className="form-buttons">
                                <button
                                    type="button"
                                    className="button-cancel"
                                    onClick={closeForm}
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className="button-save"
                                >
                                    {editingId
                                        ? "Enregistrer les modifications"
                                        : "Enregistrer le dépôt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =====================================================
                DETAILS
            ===================================================== */}
            {showDetails && selectedDepot && (
                <div className="modal-overlay">
                    <div className="details-modal">
                        <div className="details-header">
                            <h2>Détails du dépôt</h2>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => {
                                    setShowDetails(false);
                                    setSelectedDepot(null);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="details-content">
                            <div className="details-person">
                                <div className="person-avatar">👤</div>

                                <div>
                                    <h3>
                                        {selectedDepot.nom}{" "}
                                        {selectedDepot.prenom}
                                    </h3>
                                    <p>Code : {selectedDepot.code}</p>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Profession</label>
                                    <span>
                                        {selectedDepot.profession || "-"}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>Âge</label>
                                    <span>{selectedDepot.age || "-"}</span>
                                </div>

                                <div className="detail-item">
                                    <label>Date décès</label>
                                    <span>
                                        {selectedDepot.date_deces
                                            ? formatDateForInput(
                                                  selectedDepot.date_deces
                                              )
                                            : "-"}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>Provenance</label>
                                    <span>
                                        {selectedDepot.provenance || "-"}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>Emplacement</label>
                                    <span>
                                        {selectedDepot.emplacement || "-"}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>Chapelle</label>
                                    <span>
                                        {selectedDepot.chapelle || "-"}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>Déposant</label>
                                    <span>
                                        {selectedDepot.contact_nom || "-"}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <label>Téléphone</label>
                                    <span>
                                        {selectedDepot.contact_telephone ||
                                            "-"}
                                    </span>
                                </div>
                                
                            </div>

                            <div className="details-actions">
                                {hasPermission("depots.update") && (
                                    <button
                                        type="button"
                                        className="button-cancel"
                                        onClick={() => {
                                            setShowDetails(false);
                                            editDepot(selectedDepot);
                                        }}
                                    >
                                        ✏ Modifier
                                    </button>
                                )}

                                {hasPermission("depots.delete") && (
                                    <button
                                        type="button"
                                        className="details-delete"
                                        onClick={() =>
                                            demanderSuppression(selectedDepot)
                                        }
                                    >
                                        🗑 Supprimer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                CONFIRMATION
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
                NOTIFICATION
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

export default DepotCorps;