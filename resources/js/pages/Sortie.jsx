import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Sortie.css";
import ConfirmDialog from "../components/ConfirmDialog";
import NotificationBox from "../components/NotificationBox";
import Pagination from "../components/Pagination";
import { usePagination } from "../utils/usePagination";

import api, { asList } from "../services/api";
import { hasPermission } from "../services/session";

/* =========================================================
   OUTILS
========================================================= */

const getToday = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getCurrentTime = () => {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 0,
    }).format(Number(montant || 0));
};

const nombre = (valeur) => {
    const n = Number(valeur);
    return Number.isFinite(n) ? n : 0;
};

const normaliserStatut = (statut) => {
    return String(statut || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const nomDefunt = (depot) => {
    if (!depot) return "Défunt inconnu";
    const nom = `${depot.nom || ""} ${depot.prenom || ""}`.trim();
    return nom || depot.code || `Dépôt #${depot.id}`;
};

const codeDefunt = (depot) => {
    if (!depot) return "-";
    return (
        depot.code ||
        depot.code_defunt ||
        `DEP-${String(depot.id).padStart(4, "0")}`
    );
};

/* =========================================================
   NOMBRE DE NUITS
========================================================= */

const calculerNombreNuits = (dateArrivee, dateSortie) => {
    if (!dateArrivee || !dateSortie) return 0;

    const debut = new Date(`${String(dateArrivee).substring(0, 10)}T00:00:00`);
    const fin = new Date(`${String(dateSortie).substring(0, 10)}T00:00:00`);

    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
        return 0;
    }

    const difference =
        (fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24);

    return Math.max(0, Math.floor(difference));
};


/* =========================================================
   TARIF CONSERVATION
========================================================= */

const getTarifConservation = (emplacement) => {
    const valeur = String(emplacement || "").toLowerCase();

    if (
        valeur.includes("caisse 2") ||
        valeur.includes("extra large") ||
        valeur.includes("extra-large")
    ) {
        return 20000;
    }

    return 10000;
};

/* =========================================================
   OUTILS CHAPELLE / CRÉNEAUX
========================================================= */

const DUREES_LEVEE = [
    { value: 10, label: "10 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "1 heure" },
    { value: 90, label: "1 h 30" },
    { value: 120, label: "2 heures" },
    { value: 180, label: "3 heures" },
    { value: 240, label: "4 heures" },
];

/* Construit un Date complet depuis "YYYY-MM-DD" + "HH:mm" */
const construireDateHeure = (date, heure) => {
    if (!date || !heure) return null;
    const iso = `${String(date).substring(0, 10)}T${String(heure).substring(
        0,
        5
    )}:00`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

/* Retourne { debut, fin } d'une sortie selon sa durée */
const intervalleSortie = (sortie) => {
    const debut = construireDateHeure(sortie.date, sortie.heure);
    if (!debut) return null;

    const minutes = nombre(sortie.duree_levee) || 60;
    const fin = new Date(debut.getTime() + minutes * 60 * 1000);
    return { debut, fin };
};

/* Deux intervalles se chevauchent-ils ? */
const seChevauchent = (a, b) => {
    if (!a || !b) return false;
    return a.debut < b.fin && b.debut < a.fin;
};

/* Formatage "HH:mm" d'un Date */
const formatHeure = (date) => {
    if (!date) return "—";
    return `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
    ).padStart(2, "0")}`;
};

/* =========================================================
   OUTILS RETARD
========================================================= */

/* Une sortie est "en retard" si :
   - statut = EN COURS
   - date + heure déjà passées (par rapport à `now`)
*/
const estEnRetard = (sortie, now = Date.now()) => {
    if (!sortie) return false;

    const statut = normaliserStatut(sortie.statut);
    if (statut !== "EN COURS") return false;

    const debut = construireDateHeure(sortie.date, sortie.heure);
    if (!debut) return false;

    return debut.getTime() < now;
};

/* Retard formaté en jours / heures / minutes, basé sur `now` */
const formatRetard = (sortie, now = Date.now()) => {
    if (!sortie) return "—";

    const debut = construireDateHeure(sortie.date, sortie.heure);
    if (!debut) return "—";

    const diffMs = now - debut.getTime();
    if (diffMs <= 0) return "—";

    const minutes = Math.floor(diffMs / (1000 * 60));
    const heures = Math.floor(minutes / 60);
    const jours = Math.floor(heures / 24);

    if (jours >= 1) return jours === 1 ? "1 jour" : `${jours} jours`;
    if (heures >= 1) return heures === 1 ? "1 heure" : `${heures} heures`;
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
};

const valideStatut = (sortie) => {
    const s = normaliserStatut(sortie?.statut);
    return s === "VALIDE" || s === "VALIDEE" || s === "TERMINE";
};

/* =========================================================
   COMPOSANT
========================================================= */

export default function Sortie() {
    /* =====================================================
       ÉTATS
    ===================================================== */

    const [searchParams] = useSearchParams();
    const lienDepotTraite = useRef(false);

    const [sorties, setSorties] = useState([]);
    const [depots, setDepots] = useState([]);
    const [chapelles, setChapelles] = useState([]);
    const [prestations, setPrestations] = useState([]);

    const [chargement, setChargement] = useState(true);

    const [recherche, setRecherche] = useState("");
    const [filtreStatut, setFiltreStatut] = useState("TOUS");

    const [showFormulaire, setShowFormulaire] = useState(false);
    const [showPaiement, setShowPaiement] = useState(false);

    const [sortiePaiement, setSortiePaiement] = useState(null);
    const [montantPaiement, setMontantPaiement] = useState("");

    const [rechercheDefunt, setRechercheDefunt] = useState("");
    const [afficherSuggestions, setAfficherSuggestions] = useState(false);

    /* ---------- Menu actions ---------- */
    const [openMenuId, setOpenMenuId] = useState(null);

    /* ---------- Tick pour rafraîchir le calcul du retard ---------- */
    const [tick, setTick] = useState(0);

    const [form, setForm] = useState({
        id: null,
        depot_id: "",
        date: getToday(),
        heure: getCurrentTime(),
        recuperateur: "",
        chapelle_id: "",
        duree_levee: 60,
        prestations: [],
    });
    const [enregistrement, setEnregistrement] = useState(false);
    const [paiementEnCours, setPaiementEnCours] = useState(false);

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

    useEffect(() => {
        const fermer = (e) => {
            if (e.type === "keydown") {
                if (e.key === "Escape") setAfficherSuggestions(false);
                return;
            }
            if (!e.target.closest(".defunt-search-wrapper")) {
                setAfficherSuggestions(false);
            }
        };

        document.addEventListener("mousedown", fermer);
        document.addEventListener("keydown", fermer);

        return () => {
            document.removeEventListener("mousedown", fermer);
            document.removeEventListener("keydown", fermer);
        };
    }, []);

    /* ✅ Tick toutes les 60 s pour rafraîchir le calcul du retard */
    useEffect(() => {
        const timer = setInterval(() => setTick((n) => n + 1), 60 * 1000);
        return () => clearInterval(timer);
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
       CHARGEMENTS
    ===================================================== */

    const chargerSorties = async () => {
        try {
            setSorties(asList(await api.sorties.list(), "sorties"));
        } catch (error) {
            console.error("Erreur chargement sorties :", error);
            showNotif(
                "error",
                "Erreur",
                error.message || "Impossible de charger les sorties."
            );
        }
    };

    const chargerDepots = async () => {
        try {
            const liste = asList(await api.depots.list(), "depots");
            setDepots(liste);

            if (!lienDepotTraite.current) {
                lienDepotTraite.current = true;

                if (searchParams.get("nouveau") === "1") {
                    setForm({
                        id: null,
                        depot_id: "",
                        date: getToday(),
                        heure: getCurrentTime(),
                        recuperateur: "",
                        chapelle_id: "",
                        duree_levee: 60,
                        prestations: [],
                    });
                    setRechercheDefunt("");
                    setAfficherSuggestions(false);
                    setShowFormulaire(true);
                }

                const cible = Number(searchParams.get("depot"));
                const depotCible = liste.find(
                    (depot) => Number(depot.id) === cible
                );

                if (depotCible) {
                    setForm({
                        id: null,
                        depot_id: depotCible.id,
                        date: getToday(),
                        heure: getCurrentTime(),
                        recuperateur: "",
                        chapelle_id: "",
                        duree_levee: 60,
                        prestations: [],
                    });
                    setRechercheDefunt(nomDefunt(depotCible));
                    setAfficherSuggestions(false);
                    setShowFormulaire(true);
                }
            }
        } catch (error) {
            console.error("Erreur chargement dépôts :", error);
        }
    };

    const chargerChapelles = async () => {
        try {
            setChapelles(asList(await api.chapelles.list(), "chapelles"));
        } catch (error) {
            console.error("Erreur chargement chapelles :", error);
        }
    };

    const chargerPrestations = async () => {
        try {
            setPrestations(asList(await api.prestations.list(), "prestations"));
        } catch (error) {
            console.error("Erreur chargement prestations :", error);
        }
    };

    const chargerDonnees = async () => {
        setChargement(true);
        await Promise.all([
            chargerSorties(),
            chargerDepots(),
            chargerChapelles(),
            chargerPrestations(),
        ]);
        setChargement(false);
    };

    useEffect(() => {
        chargerDonnees();
    }, []);

    /* =====================================================
       DÉFUNTS DISPONIBLES
    ===================================================== */

    const depotsDisponibles = useMemo(() => {
        return depots.filter((depot) => {
            const statut = normaliserStatut(depot.statut);

            const present =
                statut === "PRESENT" ||
                statut === "ENCORE PRESENT" ||
                statut === "ENCORE_PRESENT";

            if (!present) return false;

            // Un corps scellé ne peut pas sortir
            if (depot.scelle) return false;

            if (Number(form.depot_id) === Number(depot.id)) return true;

            const sortieExistante = sorties.find(
                (sortie) => Number(sortie.depot_id) === Number(depot.id)
            );

            if (sortieExistante) {
                const statutSortie = normaliserStatut(sortieExistante.statut);

                if (
                    statutSortie === "EN COURS" ||
                    statutSortie === "VALIDE" ||
                    statutSortie === "VALIDEE" ||
                    statutSortie === "TERMINE"
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [depots, sorties, form.depot_id]);

    /* =====================================================
       RECHERCHE DÉFUNTS
    ===================================================== */

    const depotsFiltres = useMemo(() => {
        const terme = rechercheDefunt.trim().toLowerCase();

        if (!terme) return depotsDisponibles.slice(0, 20);

        return depotsDisponibles
            .filter((depot) => {
                const texte = [
                    depot.nom,
                    depot.prenom,
                    depot.code,
                    depot.code_defunt,
                    depot.emplacement,
                    depot.chapelle,
                    depot.contact_nom,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return texte.includes(terme);
            })
            .slice(0, 20);
    }, [rechercheDefunt, depotsDisponibles]);

    /* =====================================================
       CALCULS FORMULAIRE
    ===================================================== */

    const depotSelectionne = useMemo(() => {
        return depots.find(
            (depot) => Number(depot.id) === Number(form.depot_id)
        );
    }, [depots, form.depot_id]);

    const nombreNuits = useMemo(() => {
        if (!depotSelectionne) return 0;
        return calculerNombreNuits(depotSelectionne.date_arrivee, form.date);
    }, [depotSelectionne, form.date]);

    const tarifConservation = useMemo(() => {
        if (!depotSelectionne) return 0;
        return getTarifConservation(depotSelectionne.emplacement);
    }, [depotSelectionne]);

    const montantConservation = useMemo(
        () => nombreNuits * tarifConservation,
        [nombreNuits, tarifConservation]
    );

    const chapelleSelectionnee = useMemo(() => {
        return chapelles.find(
            (chapelle) => Number(chapelle.id) === Number(form.chapelle_id)
        );
    }, [chapelles, form.chapelle_id]);

    const montantChapelle = useMemo(() => {
        if (!chapelleSelectionnee) return 0;
        return nombre(chapelleSelectionnee.prix);
    }, [chapelleSelectionnee]);

    const prestationsSelectionnees = useMemo(() => {
        return prestations.filter((prestation) =>
            form.prestations.includes(Number(prestation.id))
        );
    }, [prestations, form.prestations]);

    const montantPrestations = useMemo(() => {
        return prestationsSelectionnees.reduce(
            (total, prestation) => total + nombre(prestation.prix),
            0
        );
    }, [prestationsSelectionnees]);

    const montantTotal = useMemo(() => {
        return montantConservation + montantChapelle + montantPrestations;
    }, [montantConservation, montantChapelle, montantPrestations]);

    /* =====================================================
       VÉRIFICATION DISPONIBILITÉ CHAPELLE
    ===================================================== */

    const intervalleDemande = useMemo(() => {
        const debut = construireDateHeure(form.date, form.heure);
        if (!debut) return null;
        const minutes = nombre(form.duree_levee) || 60;
        const fin = new Date(debut.getTime() + minutes * 60 * 1000);
        return { debut, fin };
    }, [form.date, form.heure, form.duree_levee]);

    const sortiesMemeChapelle = useMemo(() => {
        if (!form.chapelle_id) return [];

        return sorties.filter((s) => {
            const chapelleId = s.chapelle_id ?? s.chapelle?.id;
            if (Number(chapelleId) !== Number(form.chapelle_id)) return false;
            if (form.id && Number(s.id) === Number(form.id)) return false;

            const statut = normaliserStatut(s.statut);
            if (statut === "ANNULE" || statut === "ANNULEE") return false;

            return true;
        });
    }, [sorties, form.chapelle_id, form.id]);

    const conflitChapelle = useMemo(() => {
        if (!intervalleDemande) return null;

        for (const s of sortiesMemeChapelle) {
            const inter = intervalleSortie(s);
            if (seChevauchent(intervalleDemande, inter)) {
                return { sortie: s, intervalle: inter };
            }
        }
        return null;
    }, [intervalleDemande, sortiesMemeChapelle]);

    /* =====================================================
       SORTIES EN RETARD
    ===================================================== */

    const sortiesEnRetard = useMemo(() => {
    const now = Date.now();
    return sorties.filter((s) => estEnRetard(s, now));
}, [sorties, tick]);

    const idsEnRetard = useMemo(() => {
        return new Set(sortiesEnRetard.map((s) => s.id));
    }, [sortiesEnRetard]);

    const nombreEnRetard = sortiesEnRetard.length;

    /* =====================================================
       FILTRE LISTE SORTIES
    ===================================================== */

    const sortiesFiltrees = useMemo(() => {
        const terme = recherche.trim().toLowerCase();

        return sorties.filter((sortie) => {
            const depot = sortie.depot;

            const texte = [
                sortie.recuperateur,
                sortie.statut,
                sortie.date,
                depot?.nom,
                depot?.prenom,
                depot?.code,
                depot?.code_defunt,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const correspondRecherche = !terme || texte.includes(terme);

            const statut = normaliserStatut(sortie.statut);
            let correspondStatut = true;

            if (filtreStatut === "EN COURS") {
                correspondStatut = statut === "EN COURS";
            }

            if (filtreStatut === "VALIDÉ") {
                correspondStatut =
                    statut === "VALIDE" ||
                    statut === "VALIDEE" ||
                    statut === "TERMINE";
            }

            return correspondRecherche && correspondStatut;
        });
    }, [sorties, recherche, filtreStatut]);

    const paginationSorties = usePagination(sortiesFiltrees, {
        tailleInitiale: 10,
        resetKey: `${recherche}::${filtreStatut}`,
    });

    /* =====================================================
       SÉLECTION DÉFUNT
    ===================================================== */

    const selectionnerDefunt = (depot) => {
        let datePrevue = getToday();

        if (depot.date_sortie) {
            const dateDepot = String(depot.date_sortie).substring(0, 10);
            if (dateDepot >= getToday()) datePrevue = dateDepot;
        }

        setForm((ancien) => ({
            ...ancien,
            depot_id: depot.id,
            date: datePrevue,
            recuperateur: depot.contact_nom || ancien.recuperateur || "",
        }));

        setRechercheDefunt(nomDefunt(depot));
        setAfficherSuggestions(false);
    };

    const handleRechercheDefunt = (event) => {
        const valeur = event.target.value;
        setRechercheDefunt(valeur);
        setAfficherSuggestions(true);

        if (!valeur.trim()) {
            setForm((ancien) => ({
                ...ancien,
                depot_id: "",
                recuperateur: "",
                date: getToday(),
                chapelle_id: "",
                duree_levee: 60,
                prestations: [],
            }));
        }
    };

    /* =====================================================
       CRUD
    ===================================================== */

    const nouvelleSortie = () => {
        setForm({
            id: null,
            depot_id: "",
            date: getToday(),
            heure: getCurrentTime(),
            recuperateur: "",
            chapelle_id: "",
            duree_levee: 60,
            prestations: [],
        });

        setRechercheDefunt("");
        setAfficherSuggestions(false);
        setShowFormulaire(true);
    };

    const modifierSortie = (sortie) => {
        const statut = normaliserStatut(sortie.statut);

        if (
            statut === "VALIDE" ||
            statut === "VALIDEE" ||
            statut === "TERMINE"
        ) {
            showNotif(
                "error",
                "Action impossible",
                "Une sortie validée ne peut plus être modifiée."
            );
            return;
        }

        let prestationsExistantes = [];

        if (Array.isArray(sortie.prestations)) {
            prestationsExistantes = sortie.prestations.map((prestation) =>
                Number(prestation.id ?? prestation.prestation_id)
            );
        }

        setForm({
            id: sortie.id,
            depot_id: sortie.depot_id || "",
            date: sortie.date
                ? String(sortie.date).substring(0, 10)
                : getToday(),
            heure: sortie.heure
                ? String(sortie.heure).substring(0, 5)
                : getCurrentTime(),
            recuperateur: sortie.recuperateur || "",
            chapelle_id: sortie.chapelle_id || sortie.chapelle?.id || "",
            duree_levee: nombre(sortie.duree_levee) || 60,
            prestations: prestationsExistantes,
        });

        setRechercheDefunt(nomDefunt(sortie.depot));
        setAfficherSuggestions(false);
        setShowFormulaire(true);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((ancien) => ({ ...ancien, [name]: value }));
    };

    const handleDateChange = (event) => {
        const nouvelleDate = event.target.value;

        if (nouvelleDate && nouvelleDate < getToday()) {
            showNotif(
                "error",
                "Date invalide",
                "La date de sortie ne peut pas être antérieure à aujourd'hui."
            );
            return;
        }

        setForm((ancien) => ({ ...ancien, date: nouvelleDate }));
    };

    const handlePrestationChange = (prestationId) => {
        const id = Number(prestationId);

        setForm((ancien) => {
            const existe = ancien.prestations.includes(id);

            return {
                ...ancien,
                prestations: existe
                    ? ancien.prestations.filter((item) => item !== id)
                    : [...ancien.prestations, id],
            };
        });
    };

    /* =====================================================
       ENREGISTRER SORTIE
    ===================================================== */

    const enregistrerSortie = async (event) => {
        event.preventDefault();

        if (enregistrement) return;

        if (!form.depot_id) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner un défunt."
            );
            return;
        }

        if (!form.date) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner une date."
            );
            return;
        }

        if (!form.heure) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner une heure."
            );
            return;
        }

        if (!form.recuperateur.trim()) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez saisir le nom du récupérateur."
            );
            return;
        }

        if (form.date < getToday()) {
            showNotif(
                "error",
                "Date invalide",
                "La date de sortie ne peut pas être antérieure à aujourd'hui."
            );
            return;
        }

        /* ✅ Vérification disponibilité chapelle (front) */
        if (form.chapelle_id && conflitChapelle) {
            showNotif(
                "error",
                "Chapelle indisponible",
                `La chapelle est déjà réservée de ${formatHeure(
                    conflitChapelle.intervalle.debut
                )} à ${formatHeure(
                    conflitChapelle.intervalle.fin
                )} (sortie de ${nomDefunt(
                    conflitChapelle.sortie.depot
                )}).`
            );
            return;
        }

        const prestationsPayload = prestationsSelectionnees.map((p) =>
            Number(p.id)
        );

        const chapellePayload = chapelleSelectionnee
            ? {
                  id: Number(chapelleSelectionnee.id),
                  nom: chapelleSelectionnee.nom,
                  prix: nombre(chapelleSelectionnee.prix),
              }
            : null;

        const donnees = {
            depot_id: Number(form.depot_id),
            date: form.date,
            heure: form.heure,
            recuperateur: form.recuperateur.trim(),
            chapelle_id: chapellePayload ? chapellePayload.id : null,
            chapelle: chapellePayload,
            duree_levee: Number(form.duree_levee) || 60,
            prestations: prestationsPayload,
            montant_prestations: montantPrestations,
            montant_nuits: montantConservation,
            montant_chapelle: montantChapelle,
            montant_total: montantTotal,
        };

        try {
            setEnregistrement(true);

            if (form.id) {
                await api.sorties.update(form.id, donnees);

                showNotif(
                    "success",
                    "Sortie modifiée",
                    "Les modifications ont été enregistrées."
                );
            } else {
                await api.sorties.create(donnees);

                showNotif(
                    "success",
                    "Sortie enregistrée",
                    "La sortie a été enregistrée avec succès."
                );
            }

            setShowFormulaire(false);
            await chargerDonnees();
        } catch (error) {
            console.error("Erreur enregistrement sortie :", error);

            const erreurs = error.errors;

            const messageErreur =
                error.firstMessage ||
                erreurs?.depot_id?.[0] ||
                erreurs?.date?.[0] ||
                erreurs?.heure?.[0] ||
                erreurs?.chapelle_id?.[0] ||
                erreurs?.duree_levee?.[0] ||
                erreurs?.prestations?.[0] ||
                "Impossible d'enregistrer la sortie.";

            showNotif("error", "Échec", messageErreur);
        } finally {
            setEnregistrement(false);
        }
    };

    /* =====================================================
       PAIEMENT
    ===================================================== */

    const ouvrirPaiement = (sortie) => {
        const statut = normaliserStatut(sortie.statut);

        if (
            statut === "VALIDE" ||
            statut === "VALIDEE" ||
            statut === "TERMINE"
        ) {
            showNotif(
                "error",
                "Action impossible",
                "Cette sortie est déjà validée."
            );
            return;
        }

        const total = nombre(sortie.montant_total);
        const dejaPaye = nombre(sortie.montant_paye);
        const reste = Math.max(total - dejaPaye, 0);

        setSortiePaiement(sortie);
        setMontantPaiement(reste > 0 ? String(reste) : "");
        setShowPaiement(true);
    };

    const enregistrerPaiement = async (event) => {
        event.preventDefault();

        if (!sortiePaiement) return;
        if (paiementEnCours) return;

        const montant = Number(montantPaiement);
        const total = nombre(sortiePaiement.montant_total);
        const dejaPaye = nombre(sortiePaiement.montant_paye);
        const reste = Math.max(total - dejaPaye, 0);

        if (!Number.isFinite(montant) || montant <= 0) {
            showNotif(
                "error",
                "Montant invalide",
                "Veuillez saisir un montant de paiement valide."
            );
            return;
        }

        if (montant > reste) {
            showNotif(
                "error",
                "Montant trop élevé",
                `Le montant ne peut pas dépasser ${formatMontant(
                    reste
                )} FCFA.`
            );
            return;
        }

        try {
            setPaiementEnCours(true);
            await api.sorties.paiement(sortiePaiement.id, montant);

            setShowPaiement(false);
            setSortiePaiement(null);
            setMontantPaiement("");

            showNotif(
                "success",
                "Paiement enregistré",
                "Le paiement a été enregistré avec succès."
            );

            await chargerDonnees();
        } catch (error) {
            console.error("Erreur paiement :", error);

            showNotif(
                "error",
                "Échec du paiement",
                error.firstMessage ||
                    "Impossible d'enregistrer le paiement."
            );
        } finally {
            setPaiementEnCours(false);
        }
    };

    /* =====================================================
       IMPRIMER LE REÇU
    ===================================================== */

    const ouvrirRecu = (sortie) => {
        const prestationsRecu = Array.isArray(sortie.prestations)
            ? sortie.prestations.map((p) => ({
                  designation: p.nom || p.designation || "Prestation",
                  quantite: Number(p.quantite || 1),
                  prixUnitaire: Number(p.prix || p.prixUnitaire || 0),
              }))
            : [];

        if (Number(sortie.montant_nuits) > 0) {
            prestationsRecu.unshift({
                designation: `Conservation (${sortie.jours || 0} jour(s))`,
                quantite: 1,
                prixUnitaire: Number(sortie.montant_nuits || 0),
            });
        }

        if (Number(sortie.montant_chapelle) > 0) {
            prestationsRecu.push({
                designation: sortie.chapelle_nom
                    ? `Chapelle : ${sortie.chapelle_nom}`
                    : "Chapelle",
                quantite: 1,
                prixUnitaire: Number(sortie.montant_chapelle || 0),
            });
        }

        const donneesRecu = {
            numero: sortie.code || `REC-${sortie.id}`,
            date: sortie.date,
            heure: sortie.heure,

            etablissement: "HÔPITAL GÉNÉRAL",
            service: "SERVICE DE THANATOPRAXIE",

            nomDefunt: nomDefunt(sortie.depot),
            codeDefunt: codeDefunt(sortie.depot),

            payeur: sortie.depot?.contact_nom || sortie.recuperateur || "",
            telephonePayeur: sortie.depot?.contact_telephone || "",
            lienParente: sortie.depot?.lien_parente || "",

            prestations: prestationsRecu,

            montantPaye: Number(sortie.montant_paye || 0),
        };

        localStorage.setItem("recu_actuel", JSON.stringify(donneesRecu));
        window.open("/recu", "_blank");
    };

    /* =====================================================
       SUPPRESSION
    ===================================================== */

    const demanderSuppression = (sortie) => {
        const statut = normaliserStatut(sortie.statut);

        if (statut === "VALIDE" || statut === "VALIDEE") {
            showNotif(
                "error",
                "Action impossible",
                "Cette sortie a déjà un paiement enregistré. Elle ne peut plus être supprimée."
            );
            return;
        }

        openConfirm({
            title: "Supprimer la sortie ?",
            message: `Voulez-vous vraiment supprimer la sortie de ${nomDefunt(
                sortie.depot
            )} ?\n\nCette action est irréversible.`,
            confirmLabel: "Supprimer",
            type: "danger",
            onConfirm: async () => {
                try {
                    await api.sorties.remove(sortie.id);

                    showNotif(
                        "success",
                        "Sortie supprimée",
                        "La sortie a été supprimée ."
                    );

                    await chargerDonnees();
                } catch (error) {
                    console.error("Erreur suppression sortie :", error);

                    showNotif(
                        "error",
                        "Échec",
                        error.message || "Impossible de supprimer cette sortie."
                    );

                    throw error;
                }
            },
        });
    };

    const fermerFormulaire = () => setShowFormulaire(false);

    const fermerPaiement = () => {
        setShowPaiement(false);
        setSortiePaiement(null);
        setMontantPaiement("");
    };

    /* =====================================================
       RENDU
    ===================================================== */

    return (
        <div className="sortie-page">
            {/* EN-TÊTE */}
            <div className="sortie-header">
                <div>
                    <h1>Sorties</h1>
                </div>

                {hasPermission("sorties.create") && (
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={nouvelleSortie}
                    >
                        Nouvelle sortie
                    </button>
                )}
            </div>

            {/* ✅ ALERTE : sorties en retard */}
            {nombreEnRetard > 0 && (
                <div className="alert-banner alert-banner-danger">
                    <div className="alert-banner-icon">⚠</div>

                    <div className="alert-banner-body">
                        <strong>
                            {nombreEnRetard} sortie
                            {nombreEnRetard > 1 ? "s" : ""} en retard
                        </strong>
                        <span>
                            La date de sortie est déjà passée mais le statut
                            est encore « EN COURS ». Corrigez la date/heure
                            ou enregistrez le paiement pour finaliser la
                            sortie.
                        </span>
                    </div>

                    <button
                        type="button"
                        className="alert-banner-action"
                        onClick={() => {
                            setFiltreStatut("EN COURS");
                            setRecherche("");
                        }}
                    >
                        Voir les sorties en retard
                    </button>
                </div>
            )}

            {/* ✅ DÉTAIL DES SORTIES EN RETARD */}
            {nombreEnRetard > 0 && (
                <div className="alert-detail">
                    <div className="alert-detail-title">
                        Détail des sorties en retard
                    </div>

                    <ul className="alert-detail-list">
                        {sortiesEnRetard.map((sortie) => (
                            <li
                                key={sortie.id}
                                className="alert-detail-item"
                            >
                                <div className="alert-detail-info">
                                    <strong>
                                        {nomDefunt(sortie.depot)}
                                    </strong>
                                    <span>
                                        Code : {codeDefunt(sortie.depot)}{" "}
                                        —{" "}
                                        {String(sortie.date).substring(0, 10)}{" "}
                                        à{" "}
                                        {String(sortie.heure).substring(
                                            0,
                                            5
                                        )}
                                    </span>
                                    <span className="alert-detail-retard">
                                        Retard : {formatRetard(sortie)}
                                    </span>
                                </div>

                                <div className="alert-detail-actions">
                                    {hasPermission("sorties.update") && (
                                        <button
                                            type="button"
                                            className="btn-warning-small"
                                            onClick={() =>
                                                modifierSortie(sortie)
                                            }
                                        >
                                            ✎ Corriger
                                        </button>
                                    )}

                                    {!valideStatut(sortie) &&
                                        hasPermission("sorties.payer") && (
                                            <button
                                                type="button"
                                                className="btn-primary-small"
                                                onClick={() =>
                                                    ouvrirPaiement(sortie)
                                                }
                                            >
                                                💳 Payer & clôturer
                                            </button>
                                        )}

                                    {hasPermission("sorties.delete") && (
                                        <button
                                            type="button"
                                            className="btn-secondary-small"
                                            onClick={() =>
                                                demanderSuppression(sortie)
                                            }
                                        >
                                            🗑 Supprimer
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* TOOLBAR */}
            <div className="sortie-toolbar">
                <div className="search-box">
                    <span>⌕</span>
                    <input
                        type="text"
                        placeholder="Rechercher un défunt, code, récupérateur..."
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                    />
                    {recherche && (
                        <button type="button" onClick={() => setRecherche("")}>
                            ×
                        </button>
                    )}
                </div>

                <div className="filter-box">
                    <label>Statut</label>
                    <select
                        value={filtreStatut}
                        onChange={(e) => setFiltreStatut(e.target.value)}
                    >
                        <option value="TOUS">Tous</option>
                        <option value="EN COURS">En cours</option>
                        <option value="VALIDÉ">Validé</option>
                    </select>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="sortie-card">
                <div className="table-top">
                    <div>
                        <h2>Liste des sorties</h2>
                        <span>
                            {sortiesFiltrees.length} sortie
                            {sortiesFiltrees.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {chargement ? (
                    <div className="loading">Chargement des sorties...</div>
                ) : sortiesFiltrees.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">⇢</div>
                        <h3>Aucune sortie trouvée</h3>
                    </div>
                ) : (
                    <>
                    <div className="table-wrapper">
                        <table className="sortie-table">
                            <colgroup>
                                <col style={{ width: "95px" }} />
                                <col style={{ width: "70px" }} />
                                <col style={{ width: "100px" }} />
                                <col style={{ width: "170px" }} />
                                <col style={{ width: "150px" }} />
                                <col style={{ width: "110px" }} />
                                <col style={{ width: "110px" }} />
                                <col style={{ width: "140px" }} />
                                <col style={{ width: "100px" }} />
                                <col style={{ width: "70px" }} />
                            </colgroup>

                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Heure</th>
                                    <th>Code</th>
                                    <th>Défunt</th>
                                    <th>Récupérateur</th>
                                    <th>Prix total</th>
                                    <th>Payé</th>
                                    <th>Réduction</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {paginationSorties.items.map((sortie) => {
                                    const total = nombre(sortie.montant_total);
                                    const paye = nombre(sortie.montant_paye);
                                    const reste = Math.max(total - paye, 0);

                                    const pourcentageReste =
                                        total > 0
                                            ? Math.min(
                                                  100,
                                                  Math.round(
                                                      (reste / total) * 100
                                                  )
                                              )
                                            : 0;

                                    const statut = normaliserStatut(
                                        sortie.statut
                                    );

                                    const valide =
                                        statut === "VALIDE" ||
                                        statut === "VALIDEE" ||
                                        statut === "TERMINE";

                                    const enRetard = idsEnRetard.has(
                                        sortie.id
                                    );

                                    const scelle = sortie.depot?.scelle === true;


                                    return (
                                        <tr
                                            key={sortie.id}
                                            className={
                                                enRetard ? "row-late" : ""
                                            }
                                        >
                                            <td>
                                                {sortie.date
                                                    ? String(
                                                          sortie.date
                                                      ).substring(0, 10)
                                                    : "-"}

                                                {enRetard && (
                                                    <span
                                                        className="late-badge"
                                                        title={`En retard de ${formatRetard(
                                                            sortie
                                                        )}`}
                                                    >
                                                        ⚠
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                {sortie.heure
                                                    ? String(
                                                          sortie.heure
                                                      ).substring(0, 5)
                                                    : "-"}
                                            </td>

                                            <td>
                                                <span className="code-badge">
    {codeDefunt(sortie.depot)}
    {scelle && <span title="Corps scellé"> 🔒</span>}
</span>
                                            </td>

                                            <td>
                                                <strong>
                                                    {nomDefunt(sortie.depot)}
                                                </strong>
                                            </td>

                                            <td className="recup-cell">
                                                <strong>
                                                    {sortie.depot
                                                        ?.contact_nom || "-"}
                                                </strong>{" "}
                                                <br />
                                                <span>
                                                    {sortie.depot
                                                        ?.contact_telephone ||
                                                        ""}
                                                </span>{" "}
                                                <br />
                                                <span>
                                                    CNI :{" "}
                                                    {sortie.depot
                                                        ?.contact_cni || "-"}
                                                </span>
                                            </td>

                                            <td className="amount">
                                                {formatMontant(total)} FCFA
                                            </td>

                                            <td className="amount paid">
                                                {formatMontant(paye)} FCFA
                                            </td>

                                            <td className="amount remaining">
                                                <div className="reste-info">
                                                    <strong>
                                                        {formatMontant(reste)}{" "}
                                                        FCFA
                                                    </strong>{" "}
                                                    <br />
                                                    <span>
                                                        {pourcentageReste}%
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`status-badge ${
                                                        valide
                                                            ? "status-complete"
                                                            : "status-progress"
                                                    }`}
                                                >
                                                    {valide
                                                        ? "VALIDÉ"
                                                        : "EN COURS"}
                                                </span>
                                            </td>

                                            <td className="actions-cell">
                                                <div className="actions-menu-container">
                                                    <button
                                                        type="button"
                                                        className="actions-menu-trigger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(
                                                                openMenuId ===
                                                                    sortie.id
                                                                    ? null
                                                                    : sortie.id
                                                            );
                                                        }}
                                                        title="Actions"
                                                    >
                                                        ⋮
                                                    </button>

                                                    {openMenuId ===
                                                        sortie.id && (
                                                        <div
                                                            className="actions-menu-dropdown"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            {!scelle && hasPermission(
                                                                "sorties.update"
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    className="actions-menu-item edit"
                                                                    onClick={() => {
                                                                        modifierSortie(
                                                                            sortie
                                                                        );
                                                                        setOpenMenuId(
                                                                            null
                                                                        );
                                                                    }}
                                                                >
                                                                    ✎ Modifier
                                                                </button>
                                                            )}

                                                            {!scelle && !valide &&
                                                                hasPermission(
                                                                    "sorties.payer"
                                                                ) && (
                                                                    <button
                                                                        type="button"
                                                                        className="actions-menu-item payment"
                                                                        onClick={() => {
                                                                            ouvrirPaiement(
                                                                                sortie
                                                                            );
                                                                            setOpenMenuId(
                                                                                null
                                                                            );
                                                                        }}
                                                                    >
                                                                        💳
                                                                        Paiement
                                                                    </button>
                                                                )}

                                                            <button
                                                                type="button"
                                                                className="actions-menu-item print"
                                                                onClick={() => {
                                                                    ouvrirRecu(
                                                                        sortie
                                                                    );
                                                                    setOpenMenuId(
                                                                        null
                                                                    );
                                                                }}
                                                            >
                                                                🖨 Imprimer le
                                                                reçu
                                                            </button>

                                                            {!scelle && hasPermission(
                                                                "sorties.delete"
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    className="actions-menu-item delete"
                                                                    onClick={() => {
                                                                        demanderSuppression(
                                                                            sortie
                                                                        );
                                                                        setOpenMenuId(
                                                                            null
                                                                        );
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        page={paginationSorties.page}
                        pages={paginationSorties.pages}
                        total={paginationSorties.total}
                        taille={paginationSorties.taille}
                        onPage={paginationSorties.setPage}
                        onTaille={paginationSorties.setTaille}
                        element="sortie"
                    />
                    </>
                )}
            </div>

            {/* FORMULAIRE SORTIE */}
            {showFormulaire && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget)
                            fermerFormulaire();
                    }}
                >
                    <div className="modal sortie-form-modal">
                        <div className="modal-header">
                            <div>
                                <h2>
                                    {form.id
                                        ? "Modifier la sortie"
                                        : "Nouvelle sortie"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={fermerFormulaire}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={enregistrerSortie}>
                            {/* RECHERCHE DÉFUNT */}
                            <div className="form-section">
                                <div className="section-title">
                                    Rechercher le défunt
                                </div>

                                <div className="form-grid">
                                    <div
                                        className="form-group defunt-search-wrapper"
                                        style={{ position: "relative" }}
                                    >
                                        <label>Nom, prénom ou code *</label>
                                        <input
                                            type="text"
                                            placeholder="Tapez pour rechercher..."
                                            value={rechercheDefunt}
                                            onChange={handleRechercheDefunt}
                                            onFocus={() =>
                                                setAfficherSuggestions(true)
                                            }
                                            autoComplete="off"
                                        />

                                        {afficherSuggestions &&
                                            depotsFiltres.length > 0 && (
                                                <div className="defunt-suggestions">
                                                    {depotsFiltres.map(
                                                        (depot) => (
                                                            <button
                                                                type="button"
                                                                key={depot.id}
                                                                className={`defunt-suggestion ${
                                                                    Number(
                                                                        form.depot_id
                                                                    ) ===
                                                                    Number(
                                                                        depot.id
                                                                    )
                                                                        ? "selected"
                                                                        : ""
                                                                }`}
                                                                onClick={() =>
                                                                    selectionnerDefunt(
                                                                        depot
                                                                    )
                                                                }
                                                            >
                                                                <div className="suggestion-left">
                                                                    <strong>
                                                                        {nomDefunt(
                                                                            depot
                                                                        )}
                                                                    </strong>
                                                                    <span>
                                                                        Code :{" "}
                                                                        {codeDefunt(
                                                                            depot
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="suggestion-right">
                                                                    <span>
                                                                        {depot.emplacement ||
                                                                            "—"}
                                                                    </span>
                                                                    <small>
                                                                        Arrivée :{" "}
                                                                        {depot.date_arrivee
                                                                            ? String(
                                                                                  depot.date_arrivee
                                                                              ).substring(
                                                                                  0,
                                                                                  10
                                                                              )
                                                                            : "—"}
                                                                    </small>
                                                                </div>
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                        {afficherSuggestions &&
                                            rechercheDefunt &&
                                            depotsFiltres.length === 0 && (
                                                <div className="defunt-suggestions">
                                                    <div className="no-result">
                                                        Aucun défunt présent ne
                                                        correspond.
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {depotSelectionne && (
                                    <div className="depot-info">
                                        <span>
                                            <strong>Code :</strong>{" "}
                                            {codeDefunt(depotSelectionne)}
                                        </span>
                                        <span>
                                            <strong>Emplacement :</strong>{" "}
                                            {depotSelectionne.emplacement ||
                                                "Non renseigné"}
                                        </span>
                                        <span>
                                            <strong>Date d'arrivée :</strong>{" "}
                                            {depotSelectionne.date_arrivee
                                                ? String(
                                                      depotSelectionne.date_arrivee
                                                  ).substring(0, 10)
                                                : "—"}
                                        </span>
                                        <span>
                                            <strong>Déposant :</strong>{" "}
                                            {depotSelectionne.contact_nom ||
                                                "Non renseigné"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* DATE / HEURE / RÉCUPÉRATEUR */}
                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Date de sortie *</label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={form.date}
                                            min={getToday()}
                                            onChange={handleDateChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Heure *</label>
                                        <input
                                            type="time"
                                            name="heure"
                                            value={form.heure}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Nom du récupérateur *</label>
                                        <input
                                            type="text"
                                            name="recuperateur"
                                            value={form.recuperateur}
                                            onChange={handleChange}
                                            placeholder="Nom complet"
                                            maxLength={255}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CONSERVATION */}
                            {depotSelectionne && (
                                <div className="form-section">
                                    <div className="section-title">
                                        Conservation
                                    </div>

                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Emplacement</label>
                                            <input
                                                type="text"
                                                value={
                                                    depotSelectionne.emplacement ||
                                                    "Non renseigné"
                                                }
                                                disabled
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Nombre de jours</label>
                                            <input
                                                type="text"
                                                value={nombreNuits}
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <div className="tarif-info">
                                        Tarif :{" "}
                                        <strong>
                                            {formatMontant(tarifConservation)}{" "}
                                            FCFA / jour
                                        </strong>
                                    </div>
                                </div>
                            )}

                            {/* PRESTATIONS */}
                            <div className="form-section">
                                <div className="section-title">
                                    Prestations
                                </div>

                                {prestations.length === 0 ? (
                                    <div className="no-result">
                                        Aucune prestation disponible.
                                    </div>
                                ) : (
                                    <div className="prestations-grid">
                                        {prestations.map((prestation) => {
                                            const id = Number(prestation.id);
                                            const selectionnee =
                                                form.prestations.includes(id);

                                            return (
                                                <label
                                                    key={prestation.id}
                                                    className="checkbox-line"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectionnee}
                                                        onChange={() =>
                                                            handlePrestationChange(
                                                                id
                                                            )
                                                        }
                                                    />
                                                    <span>
                                                        {prestation.nom}
                                                        {" — "}
                                                        <strong>
                                                            {formatMontant(
                                                                prestation.prix
                                                            )}{" "}
                                                            FCFA
                                                        </strong>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* CHAPELLE + DURÉE LEVÉE */}
                            <div className="form-section">
                                <div className="section-title">Chapelle</div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Sélectionner une chapelle</label>
                                        <select
                                            name="chapelle_id"
                                            value={form.chapelle_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">
                                                Aucune chapelle
                                            </option>
                                            {chapelles.map((chapelle) => (
                                                <option
                                                    key={chapelle.id}
                                                    value={chapelle.id}
                                                >
                                                    {chapelle.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ✅ Durée de la levée affichée seulement si chapelle choisie */}
                                    {form.chapelle_id && (
                                        <div className="form-group">
                                            <label>
                                                Durée de la levée de corps *
                                            </label>
                                            <select
                                                name="duree_levee"
                                                value={form.duree_levee}
                                                onChange={handleChange}
                                                required
                                            >
                                                {DUREES_LEVEE.map((d) => (
                                                    <option
                                                        key={d.value}
                                                        value={d.value}
                                                    >
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* ✅ Message de conflit */}
                                {form.chapelle_id && conflitChapelle && (
                                    <div className="alert alert-danger">
                                        ⚠ La chapelle n'est pas libre sur ce
                                        créneau. Elle est occupée de{" "}
                                        <strong>
                                            {formatHeure(
                                                conflitChapelle.intervalle
                                                    .debut
                                            )}
                                        </strong>{" "}
                                        à{" "}
                                        <strong>
                                            {formatHeure(
                                                conflitChapelle.intervalle.fin
                                            )}
                                        </strong>{" "}
                                        (Lévée de{" "}
                                        {nomDefunt(
                                            conflitChapelle.sortie.depot
                                        )}
                                        ).
                                    </div>
                                )}

                                {/* ✅ Rappel du créneau sélectionné */}
                                {form.chapelle_id && intervalleDemande && (
                                    <div className="creneau-info">
                                        Créneau sélectionné :{" "}
                                        <strong>
                                            {formatHeure(
                                                intervalleDemande.debut
                                            )}{" "}
                                            →{" "}
                                            {formatHeure(
                                                intervalleDemande.fin
                                            )}
                                        </strong>
                                    </div>
                                )}
                            </div>

                            {/* APERÇU FINANCIER */}
                            <div className="form-section financial-section">
                                <div className="section-title">
                                    Aperçu financier
                                </div>

                                <div className="finance-grid">
                                    <div className="finance-item">
                                        <span>Montant conservation</span>
                                        <strong>
                                            {formatMontant(
                                                montantConservation
                                            )}{" "}
                                            FCFA
                                        </strong>
                                    </div>
                                    <div className="finance-item">
                                        <span>Prestations</span>
                                        <strong>
                                            {formatMontant(
                                                montantPrestations
                                            )}{" "}
                                            FCFA
                                        </strong>
                                    </div>
                                    <div className="finance-item">
                                        <span>Chapelle</span>
                                        <strong>
                                            {formatMontant(montantChapelle)}{" "}
                                            FCFA
                                        </strong>
                                    </div>
                                    <div className="finance-total">
                                        <span>Montant total</span>
                                        <strong>
                                            {formatMontant(montantTotal)} FCFA
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* BOUTONS */}
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={fermerFormulaire}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={
                                        enregistrement ||
                                        (!!form.chapelle_id &&
                                            !!conflitChapelle)
                                    }
                                >
                                    {enregistrement
                                        ? "Enregistrement..."
                                        : form.id
                                        ? "Enregistrer les modifications"
                                        : "Enregistrer la sortie"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE PAIEMENT */}
            {showPaiement && sortiePaiement && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget)
                            fermerPaiement();
                    }}
                >
                    <div className="modal payment-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Enregistrer le paiement</h2>
                                <p>{nomDefunt(sortiePaiement.depot)}</p>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={fermerPaiement}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={enregistrerPaiement}>
                            <div className="payment-summary">
                                <div>
                                    <span>Montant total</span>
                                    <strong>
                                        {formatMontant(
                                            sortiePaiement.montant_total
                                        )}{" "}
                                        FCFA
                                    </strong>
                                </div>
                                <div>
                                    <span>Déjà payé</span>
                                    <strong>
                                        {formatMontant(
                                            sortiePaiement.montant_paye
                                        )}{" "}
                                        FCFA
                                    </strong>
                                </div>
                                <div>
                                    <span>Reste à payer</span>
                                    <strong>
                                        {formatMontant(
                                            Math.max(
                                                nombre(
                                                    sortiePaiement.montant_total
                                                ) -
                                                    nombre(
                                                        sortiePaiement.montant_paye
                                                    ),
                                                0
                                            )
                                        )}{" "}
                                        FCFA
                                    </strong>
                                </div>
                            </div>

                            <div className="payment-input">
                                <label>Montant à payer *</label>
                                <div className="amount-input">
                                    <input
                                        type="number"
                                        min="1"
                                        max={Math.max(
                                            nombre(
                                                sortiePaiement.montant_total
                                            ) -
                                                nombre(
                                                    sortiePaiement.montant_paye
                                                ),
                                            0
                                        )}
                                        step="1"
                                        value={montantPaiement}
                                        onChange={(event) =>
                                            setMontantPaiement(
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                    <span>FCFA</span>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={fermerPaiement}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary payment-submit"
                                    disabled={paiementEnCours}
                                >
                                    {paiementEnCours
                                        ? "Enregistrement..."
                                        : "Enregistrer le paiement"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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