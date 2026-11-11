import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Transfert.css";
import ConfirmDialog from "../components/ConfirmDialog";
import NotificationBox from "../components/NotificationBox";

import api from "../services/api";
import { hasPermission } from "../services/session";

function Transfert() {
    /* =====================================================
       ÉTATS
    ===================================================== */

    const [searchParams] = useSearchParams();
    const lienDepotTraite = useRef(false);

    const [transferts, setTransferts] = useState([]);
    const [depots, setDepots] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingDepots, setLoadingDepots] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [statutFiltre, setStatutFiltre] = useState("TOUS");

    /* ---------- Menu actions ---------- */
    const [openMenuId, setOpenMenuId] = useState(null);

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

    /* Emplacement initial (pour modification) */
    const [emplacementInitial, setEmplacementInitial] = useState("");

    /* =====================================================
       FERMER LE MENU AU CLIC EXTÉRIEUR / ÉCHAP
    ===================================================== */

    useEffect(() => {
        const fermerMenu = () => setOpenMenuId(null);
        const gererEchap = (e) => {
            if (e.key === "Escape") setOpenMenuId(null);
        };

        document.addEventListener("click", fermerMenu);
        document.addEventListener("keydown", gererEchap);

        return () => {
            document.removeEventListener("click", fermerMenu);
            document.removeEventListener("keydown", gererEchap);
        };
    }, []);

    /* =====================================================
       HELPERS MODALES
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
       DATE DU JOUR
    ===================================================== */

    const getDateAujourdhui = () => {
        return new Date().toISOString().split("T")[0];
    };

    /* =====================================================
       FORMULAIRE
    ===================================================== */

    const [formData, setFormData] = useState({
        date: getDateAujourdhui(),
        heure: "",
        depot_id: "",
        type: "",
        emplacement_destination: "",
        destination: "",
        motif: "",
    });

    /* =====================================================
       EXTRACTION DES DONNÉES
    ===================================================== */

    const extractList = (result) => {
        if (Array.isArray(result)) return result;
        if (Array.isArray(result?.data)) return result.data;
        return [];
    };

    /* =====================================================
       NORMALISER LE STATUT D'UN DÉPÔT
    ===================================================== */

    const normaliserStatutDepot = (depot) => {
        return String(depot?.statut || "")
            .trim()
            .toUpperCase();
    };

    const depotEstPresent = (depot) => {
        if (!depot) return false;
        return normaliserStatutDepot(depot) === "PRÉSENT";
    };

    /* =====================================================
       CHARGER LES DÉPÔTS
    ===================================================== */

    const loadDepots = async () => {
        try {
            setLoadingDepots(true);

            const result = await api.depots.list();
            const liste = extractList(result);

            setDepots(liste);

            if (!lienDepotTraite.current) {
                lienDepotTraite.current = true;

                if (searchParams.get("nouveau") === "1") {
                    setEditingId(null);
                    setEmplacementInitial("");
                    setShowForm(true);
                }

                const cible = Number(searchParams.get("depot"));
                const depotCible = liste.find(
                    (depot) => Number(depot.id) === cible
                );

                if (depotCible) {
                    setEditingId(null);
                    setEmplacementInitial("");
                    setFormData({
                        date: getDateAujourdhui(),
                        heure: "",
                        depot_id: String(depotCible.id),
                        type: "",
                        emplacement_destination: "",
                        destination: "",
                        motif: "",
                    });
                    setShowForm(true);
                }
            }
        } catch (error) {
            console.error("Erreur chargement dépôts :", error);
            showNotif(
                "error",
                "Erreur",
                error.message || "Impossible de charger les dépôts."
            );
        } finally {
            setLoadingDepots(false);
        }
    };

    /* =====================================================
       CHARGER LES TRANSFERTS
    ===================================================== */

    const loadTransferts = async () => {
        try {
            setLoading(true);

            const result = await api.transferts.list();

            setTransferts(extractList(result));
        } catch (error) {
            console.error("Erreur chargement transferts :", error);
            showNotif(
                "error",
                "Erreur",
                error.message || "Impossible de charger les transferts."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       CHARGEMENT INITIAL
    ===================================================== */

    useEffect(() => {
        loadDepots();
        loadTransferts();
    }, []);

    /* =====================================================
       DÉPÔTS DISPONIBLES
    ===================================================== */

    const depotsDisponibles = useMemo(() => {
    return depots.filter(
        (depot) => depotEstPresent(depot) && !depot.scelle
    );
}, [depots]);
    /* =====================================================
       CHANGEMENT DES CHAMPS
    ===================================================== */

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((ancien) => {
            const nouveau = { ...ancien, [name]: value };

            if (name === "type" && value === "interne") {
                nouveau.destination = "";
            }

            if (name === "type" && value === "externe") {
                nouveau.emplacement_destination = "";
            }

            return nouveau;
        });
    };

    /* =====================================================
       DÉPÔT SÉLECTIONNÉ
    ===================================================== */

    const depotSelectionne = useMemo(() => {
        if (!formData.depot_id) return null;

        return (
            depots.find(
                (depot) => Number(depot.id) === Number(formData.depot_id)
            ) || null
        );
    }, [formData.depot_id, depots]);

    /* =====================================================
       EMPLACEMENTS EXISTANTS
    ===================================================== */

    const emplacements = useMemo(() => {
        const liste = depots
            .map((depot) => depot.emplacement)
            .filter(
                (emplacement) =>
                    emplacement !== null &&
                    emplacement !== undefined &&
                    String(emplacement).trim() !== ""
            )
            .map((emplacement) => String(emplacement).trim());

        return [...new Set(liste)];
    }, [depots]);

    /* =====================================================
       NOUVEAU TRANSFERT
    ===================================================== */

    const openForm = () => {
        setEditingId(null);
        setEmplacementInitial("");

        setFormData({
            date: getDateAujourdhui(),
            heure: "",
            depot_id: "",
            type: "",
            emplacement_destination: "",
            destination: "",
            motif: "",
        });

        setShowForm(true);
    };

    /* =====================================================
       FERMER FORMULAIRE
    ===================================================== */

    const closeForm = () => {
        if (saving) return;

        setShowForm(false);
        setEditingId(null);
        setEmplacementInitial("");
    };

    /* =====================================================
       MODIFIER UN TRANSFERT
    ===================================================== */

    const editTransfert = (transfert) => {
        const depotId = transfert.depot_id ?? transfert.depot?.id ?? "";

        let date = "";
        if (transfert.date) {
            date = String(transfert.date).substring(0, 10);
        }

        let heure = "";
        if (transfert.heure) {
            heure = String(transfert.heure).substring(0, 5);
        }

        const type = String(transfert.type || "").toLowerCase();

        const destination = transfert.destination || "";

        const emplacementDestination =
            transfert.emplacement_destination ??
            transfert.nouvel_emplacement ??
            "";

        /* =====================================================
           EMPLACEMENT ACTUEL
           On utilise la PROVENANCE sauvegardée en priorité
        ===================================================== */
        const emplacementActuel =
            transfert.provenance ||
            transfert.depot?.emplacement ||
            transfert.emplacement_source ||
            transfert.ancien_emplacement ||
            "";

        const depotLie = depots.find(
            (depot) => Number(depot.id) === Number(depotId)
        );

        if (depotLie && !depotEstPresent(depotLie)) {
            showNotif(
                "error",
                "Action impossible",
                "Ce défunt est déjà sorti. Son transfert ne peut plus être modifié."
            );
            return;
        }

        if (depotLie?.scelle) {
    showNotif(
        "error",
        "Corps scellé",
        "Ce corps est scellé. Son transfert ne peut pas être modifié."
    );
    return;
}

        setEditingId(transfert.id);
        setEmplacementInitial(emplacementActuel);

        setFormData({
            date: date || getDateAujourdhui(),
            heure,
            depot_id: depotId,
            type,
            emplacement_destination: emplacementDestination,
            destination,
            motif: "",
        });

        setShowForm(true);
    };

    /* =====================================================
       SUPPRIMER UN TRANSFERT
    ===================================================== */

    const demanderSuppression = (transfert) => {
        openConfirm({
            title: "Supprimer le transfert ?",
            message: `Voulez-vous vraiment supprimer ce transfert ?\n\nCette action est irréversible.`,
            confirmLabel: "Supprimer",
            type: "danger",
            onConfirm: async () => {
                try {
                    await api.transferts.remove(transfert.id);

                    await loadTransferts();
                    await loadDepots();

                    showNotif(
                        "success",
                        "Transfert supprimé",
                        "Le transfert a été supprimé avec succès."
                    );
                } catch (error) {
                    console.error("Erreur suppression :", error);
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

    /* =====================================================
       VALIDATION FORMULAIRE
    ===================================================== */

    const validateForm = () => {
       if (!String(formData.motif || "").trim()) {
    showNotif(
        "error",
        "Champ manquant",
        "Veuillez renseigner le motif du transfert."
    );
    return false;
}

        const aujourdHui = getDateAujourdhui();

        if (formData.date < aujourdHui) {
            showNotif(
                "error",
                "Date invalide",
                "La date du transfert ne peut pas être antérieure à aujourd'hui."
            );
            return false;
        }

        if (!formData.heure) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner une heure."
            );
            return false;
        }

        if (!formData.depot_id) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner un défunt."
            );
            return false;
        }

        const depot = depots.find(
            (element) => Number(element.id) === Number(formData.depot_id)
        );

        if (!depot) {
            showNotif(
                "error",
                "Défunt introuvable",
                "Le défunt sélectionné n'existe plus."
            );
            return false;
        }

        if (!depotEstPresent(depot)) {
            showNotif(
                "error",
                "Action impossible",
                "Ce défunt est déjà sorti et ne peut plus être transféré."
            );
            return false;
        }

        if (depot.scelle) {
    showNotif(
        "error",
        "Corps scellé",
        "Ce corps est scellé. Seul l'administrateur peut le desceller."
    );
    return false;
}

        if (!formData.type) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner le type de transfert."
            );
            return false;
        }

        if (
            formData.type === "interne" &&
            !String(formData.emplacement_destination || "").trim()
        ) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner le nouvel emplacement."
            );
            return false;
        }

        if (
            formData.type === "interne" &&
            emplacementInitial &&
            String(formData.emplacement_destination).trim() ===
                String(emplacementInitial).trim()
        ) {
            showNotif(
                "error",
                "Emplacement identique",
                "Le nouvel emplacement doit être différent de l'emplacement actuel."
            );
            return false;
        }

        if (
            formData.type === "externe" &&
            !String(formData.destination || "").trim()
        ) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez renseigner la destination externe."
            );
            return false;
        }

        return true;
    };

    /* =====================================================
       ENREGISTRER / MODIFIER
    ===================================================== */

    const saveTransfert = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);

        const dataToSend = {
            date: formData.date,
            heure: formData.heure,
            depot_id: Number(formData.depot_id),
            type: formData.type,
            emplacement_destination:
                formData.type === "interne"
                    ? String(formData.emplacement_destination).trim()
                    : null,
            destination:
                formData.type === "externe"
                    ? String(formData.destination).trim()
                    : null,

                    motif: String(formData.motif).trim(),
                    statut: "EN ATTENTE", 
        };

        try {
            if (editingId) {
                await api.transferts.update(editingId, dataToSend);
            } else {
                await api.transferts.create(dataToSend);
            }

            await loadTransferts();
            await loadDepots();

            setShowForm(false);
            setEditingId(null);
            setEmplacementInitial("");

            showNotif(
                "success",
                editingId ? "Transfert modifié" : "Transfert enregistré",
                editingId
                    ? "Le transfert a été modifié avec succès."
                    : "Le transfert a été enregistré avec succès."
            );
        } catch (error) {
            console.error("Erreur enregistrement transfert :", error);
            if (error.errors) {
                showNotif(
                    "error",
                    "Erreur de validation",
                    Object.values(error.errors).flat().join(" ")
                );
            } else {
                showNotif(
                    "error",
                    "Échec",
                    error.message || "Erreur lors de l'enregistrement du transfert."
                );
            }
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       RECHERCHE + FILTRE
    ===================================================== */

    const transfertsFiltres = useMemo(() => {
        const recherche = search.toLowerCase().trim();

        return transferts.filter((transfert) => {
            const depot = transfert.depot || {};

            const nom = depot.nom || transfert.nom || "";
            const prenom = depot.prenom || transfert.prenom || "";
            const code = depot.code || transfert.code || "";

            const provenance =
                transfert.provenance ||
                depot.emplacement ||
                transfert.emplacement_source ||
                "";

            const destination =
                String(transfert.type || "").toLowerCase() === "interne"
                    ? transfert.emplacement_destination ||
                      transfert.nouvel_emplacement ||
                      ""
                    : transfert.destination || "";

            const texteRecherche = [
                code,
                nom,
                prenom,
                `${nom} ${prenom}`,
                transfert.type || "",
                provenance,
                destination,
                transfert.motif || "",
            ]
                .join(" ")
                .toLowerCase();

            const correspondRecherche = texteRecherche.includes(recherche);

            const correspondStatut =
                statutFiltre === "TOUS" ||
                transfert.statut === statutFiltre;

            return correspondRecherche && correspondStatut;
        });
    }, [transferts, search, statutFiltre]);

    /* =====================================================
       GETTERS
    ===================================================== */

    const getNomDefunt = (transfert) => {
        if (transfert.depot) {
            return (
                `${transfert.depot.nom || ""} ${
                    transfert.depot.prenom || ""
                }`.trim() || "-"
            );
        }

        if (transfert.nom || transfert.prenom) {
            return (
                `${transfert.nom || ""} ${transfert.prenom || ""}`.trim() ||
                "-"
            );
        }

        return "-";
    };

    const getCodeDefunt = (transfert) => {
        if (transfert.depot?.code) return transfert.depot.code;
        if (transfert.code) return transfert.code;
        return "-";
    };

    /* =====================================================
       ⚠️ PROVENANCE FIGÉE
       On utilise transfert.provenance en priorité,
       pas transfert.depot.emplacement (dynamique)
    ===================================================== */
    const getEmplacement = (transfert) => {
        // 1. Provenance sauvegardée (valeur figée au moment du transfert)
        if (transfert.provenance) {
            return transfert.provenance;
        }

        // 2. Ancien champ (compatibilité)
        if (transfert.emplacement_source) {
            return transfert.emplacement_source;
        }

        // 3. Fallback (dernier recours)
        if (transfert.depot) {
            return transfert.depot.emplacement || "-";
        }

        return "-";
    };

    const getDestination = (transfert) => {
        const type = String(transfert.type || "").toLowerCase();

        if (type === "interne") {
            return (
                transfert.emplacement_destination ||
                transfert.nouvel_emplacement ||
                "-"
            );
        }

        return transfert.destination || "-";
    };

    const getType = (transfert) => {
        return String(transfert.type || "").toLowerCase();
    };

    const getStatut = (transfert) => {
        return transfert.statut || "EN ATTENTE";
    };

    /* =====================================================
       AFFICHAGE
    ===================================================== */

    return (
        <div className="transfert-page">
            {/* HEADER */}
            <header className="transfert-header">
                <div className="transfert-title">TRANSFERTS</div>
                <div className="transfert-count">
                    {transfertsFiltres.length} TRANSFERT(S)
                </div>
            </header>

            {/* TOOLBAR */}
            <div className="transfert-toolbar">
                <div className="transfert-search">
                    <span>⌕</span>
                    <input
                        type="text"
                        placeholder="Rechercher par code, nom, prénom ou destination..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="transfert-filter">
                    <label>STATUT</label>
                    <select
                        value={statutFiltre}
                        onChange={(e) => setStatutFiltre(e.target.value)}
                    >
                        <option value="TOUS">TOUS</option>
                        <option value="EN ATTENTE">EN ATTENTE</option>
                        <option value="VALIDÉ">VALIDÉ</option>
                    </select>
                </div>

                {hasPermission("transferts.create") && (
                    <button
                        type="button"
                        className="new-transfert-button"
                        onClick={openForm}
                    >
                        NOUVEAU TRANSFERT
                    </button>
                )}
            </div>

            {/* TABLEAU */}
            <div className="transfert-board">
                <div className="transfert-columns">
                    <div>DATE</div>
                    <div>HEURE</div>
                    <div>CODE</div>
                    <div>DÉFUNT</div>
                    <div>TYPE</div>
                    <div>PROVENANCE</div>
                    <div>DESTINATION</div>
                    <div>STATUT</div>
                    <div>ACTIONS</div>
                </div>

                {loading ? (
                    <div className="transfert-empty">
                        CHARGEMENT DES TRANSFERTS...
                    </div>
                ) : transfertsFiltres.length > 0 ? (
                    transfertsFiltres.map((transfert) => {
                        const type = getType(transfert);
                        const statut = getStatut(transfert);

                        return (
                            <div className="transfert-row" key={transfert.id}>
                                <div>
                                    {transfert.date
                                        ? String(transfert.date).substring(0, 10)
                                        : "-"}
                                </div>

                                <div className="transfert-time">
                                    <strong>
                                        {transfert.heure
                                            ? String(transfert.heure).substring(0, 5)
                                            : "-"}
                                    </strong>
                                    <small>HEURE</small>
                                </div>

                                <div>
                                    <span className="transfert-code">
                                        {getCodeDefunt(transfert)}
                                    </span>
                                </div>

                                <div className="transfert-defunt">
                                    {getNomDefunt(transfert)}
                                </div>

                                <div>
                                    <span
                                        className={
                                            type === "interne"
                                                ? "type-badge interne"
                                                : "type-badge externe"
                                        }
                                    >
                                        {type === "interne"
                                            ? "INTERNE"
                                            : "EXTERNE"}
                                    </span>
                                </div>

                                <div>{getEmplacement(transfert)}</div>

                                <div className="transfert-destination">
                                    {getDestination(transfert)}
                                </div>

                                <div>
                                    <span
                                        className={
                                            statut === "VALIDÉ"
                                                ? "transfert-status validated"
                                                : "transfert-status waiting"
                                        }
                                    >
                                        ● {statut}
                                    </span>
                                </div>

                                {/* ===== MENU ACTIONS ===== */}
                                <div className="transfert-actions-menu">
                                    <button
                                        type="button"
                                        className="actions-menu-trigger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(
                                                openMenuId === transfert.id
                                                    ? null
                                                    : transfert.id
                                            );
                                        }}
                                        title="Actions"
                                    >
                                        ⋮
                                    </button>

                                    {openMenuId === transfert.id && (
                                        <div
                                            className="actions-menu-dropdown"
                                            onClick={(e) =>
                                                e.stopPropagation()
                                            }
                                        >
                                            {hasPermission("transferts.update") && (
                                                <button
                                                    type="button"
                                                    className="actions-menu-item edit"
                                                    onClick={() => {
                                                        editTransfert(transfert);
                                                        setOpenMenuId(null);
                                                    }}
                                                >
                                                    ✎ Modifier
                                                </button>
                                            )}

                                            {hasPermission("transferts.delete") && (
                                                <button
                                                    type="button"
                                                    className="actions-menu-item delete"
                                                    onClick={() => {
                                                        demanderSuppression(
                                                            transfert
                                                        );
                                                        setOpenMenuId(null);
                                                    }}
                                                >
                                                    🗑 Supprimer
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="transfert-empty">
                        AUCUN TRANSFERT NE CORRESPOND À VOTRE RECHERCHE
                    </div>
                )}

                <div className="transfert-footer">
                    <span>
                        {transfertsFiltres.length} TRANSFERT(S) AFFICHÉ(S)
                    </span>
                </div>
            </div>

            {/* ==========================================
                MODALE FORMULAIRE
            ========================================== */}
            {showForm && (
                <div
                    className="transfert-modal-background"
                    onClick={closeForm}
                >
                    <div
                        className="transfert-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="transfert-modal-header">
                            <div>
                                <h2>
                                    {editingId
                                        ? "MODIFIER LE TRANSFERT"
                                        : "NOUVEAU TRANSFERT"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="transfert-close"
                                onClick={closeForm}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={saveTransfert}>
                            <div className="transfert-form-grid">
                                {/* DATE */}
                                <div className="transfert-input-group">
                                    <label>DATE</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date || ""}
                                        min={getDateAujourdhui()}
                                        max="2099-12-31"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {/* HEURE */}
                                <div className="transfert-input-group">
                                    <label>HEURE</label>
                                    <input
                                        type="time"
                                        name="heure"
                                        value={formData.heure || ""}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {/* DÉFUNT */}
                                <div className="transfert-input-group transfert-input-full">
                                    <label>DÉFUNT</label>
                                    <select
                                        name="depot_id"
                                        value={formData.depot_id || ""}
                                        onChange={handleChange}
                                        disabled={loadingDepots}
                                        required
                                    >
                                        <option value="">
                                            {loadingDepots
                                                ? "CHARGEMENT..."
                                                : "SÉLECTIONNER UN DÉFUNT"}
                                        </option>

                                        {depotsDisponibles.map((depot) => (
                                            <option
                                                key={depot.id}
                                                value={depot.id}
                                            >
                                                {depot.code} — {depot.nom}{" "}
                                                {depot.prenom}
                                            </option>
                                        ))}
                                    </select>

                                    {!loadingDepots &&
                                        depotsDisponibles.length === 0 && (
                                            <small className="form-warning">
                                                Aucun défunt présent n'est
                                                disponible pour un transfert.
                                            </small>
                                        )}
                                </div>

                                {/* INFOS DÉPÔT */}
                                {depotSelectionne && (
                                    <div className="depot-info-box transfert-input-full">
                                        <div>
                                            <span>CODE : </span>
                                            <strong>
                                                {depotSelectionne.code || "-"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>DÉFUNT : </span>
                                            <strong>
                                                {depotSelectionne.nom || ""}{" "}
                                                {depotSelectionne.prenom || ""}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>EMPLACEMENT ACTUEL : </span>
                                            <strong>
                                                {depotSelectionne.emplacement ||
                                                    "-"}
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                {/* TYPE */}
                                <div className="transfert-input-group transfert-input-full">
                                    <label>TYPE DE TRANSFERT</label>
                                    <select
                                        name="type"
                                        value={formData.type || ""}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">SÉLECTIONNER</option>
                                        <option value="interne">
                                            TRANSFERT INTERNE
                                        </option>
                                        <option value="externe">
                                            TRANSFERT EXTERNE
                                        </option>
                                    </select>
                                </div>

                                {/* INTERNE */}
                                {formData.type === "interne" && (
                                    <div className="transfert-input-group transfert-input-full">
                                        <label>NOUVEL EMPLACEMENT</label>
                                        <select
                                            name="emplacement_destination"
                                            value={
                                                formData.emplacement_destination ||
                                                ""
                                            }
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">
                                                SÉLECTIONNER UN EMPLACEMENT
                                            </option>

                                            {emplacements.map((emplacement) => (
                                                <option
                                                    key={emplacement}
                                                    value={emplacement}
                                                >
                                                    {emplacement}
                                                </option>
                                            ))}
                                        </select>

                                        {emplacements.length === 0 && (
                                            <small className="form-warning">
                                                Aucun emplacement enregistré
                                                dans les dépôts.
                                            </small>
                                        )}
                                    </div>
                                )}

                                {/* EXTERNE */}
                                {formData.type === "externe" && (
                                    <div className="transfert-input-group transfert-input-full">
                                        <label>DESTINATION EXTERNE</label>
                                        <input
                                            type="text"
                                            name="destination"
                                            value={formData.destination || ""}
                                            onChange={handleChange}
                                            placeholder="Nom du lieu, hôpital, clinique, domicile..."
                                            maxLength="255"
                                            required
                                        />
                                    </div>
                                )}

                                {/* STATUT */}
                                {/* MOTIF */}
<div className="transfert-input-group transfert-input-full">
    <label>MOTIF DU TRANSFERT</label>
    <input
        type="text"
        name="motif"
        value={formData.motif || ""}
        onChange={handleChange}
        placeholder="Ex : demande de la famille, autopsie, rapatriement..."
        maxLength="255"
        required
    />
</div>
                            </div>

                            {/* BOUTONS */}
                            <div className="transfert-form-buttons">
                                <button
                                    type="button"
                                    className="transfert-cancel"
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    ANNULER
                                </button>

                                <button
                                    type="submit"
                                    className="transfert-save"
                                    disabled={saving || loadingDepots}
                                >
                                    {saving
                                        ? "ENREGISTREMENT..."
                                        : editingId
                                        ? "ENREGISTRER LES MODIFICATIONS"
                                        : "ENREGISTRER LE TRANSFERT"}
                                </button>
                            </div>
                        </form>
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

export default Transfert;