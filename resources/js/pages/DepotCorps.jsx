import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./DepotCorps.css";
import ConfirmDialog from "../components/ConfirmDialog";
import NotificationBox from "../components/NotificationBox";
import Pagination from "../components/Pagination";
import { usePagination } from "../utils/usePagination";

import api, { asList } from "../services/api";
import { hasPermission } from "../services/session";

/* =========================================================
   PRÉFIXE ANNÉE POUR LE CODE DÉPÔT (26PA)
========================================================= */
const getPrefixeAnnee = () => {
    const annee = new Date().getFullYear();
    const court = String(annee).slice(-2);
    return `${court}PA`;
};

const PREFIXE_ANNEE = getPrefixeAnnee();

/* =========================================================
   PRÉVISUALISATION DU CODE DÉFUNT (NOV0001)
   Le backend reste la source de vérité.
========================================================= */
const MOIS_COURTS = [
    "JAN", "FEV", "MAR", "AVR", "MAI", "JUI",
    "JUL", "AOU", "SEP", "OCT", "NOV", "DEC",
];

const getPrefixeMois = (date = new Date()) => MOIS_COURTS[date.getMonth()];

const extraireNumero = (code, prefixe) => {
    if (!code || !String(code).startsWith(prefixe)) return 0;
    const n = parseInt(String(code).slice(prefixe.length), 10);
    return Number.isFinite(n) ? n : 0;
};

const prochainCodeDefunt = (depots) => {
    const prefixe = getPrefixeMois();
    const max = (depots || []).reduce(
        (m, d) => Math.max(m, extraireNumero(d.code_defunt, prefixe)),
        0
    );
    return `${prefixe}${String(max + 1).padStart(4, "0")}`;
};

/* =========================================================
   OUTILS ÂGE ↔ DATE DE NAISSANCE
========================================================= */
const dateNaissanceDepuisAge = (ageStr) => {
    const age = Number(ageStr);
    if (!Number.isFinite(age) || age < 0 || age > 150) return "";
    const annee = new Date().getFullYear() - age;
    return `${annee}-01-01`;
};

const ageDepuisDateNaissance = (dateStr) => {
    if (!dateStr) return "";
    const naissance = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(naissance.getTime())) return "";

    const aujourdHui = new Date();
    let age = aujourdHui.getFullYear() - naissance.getFullYear();

    const mois = aujourdHui.getMonth() - naissance.getMonth();
    if (
        mois < 0 ||
        (mois === 0 && aujourdHui.getDate() < naissance.getDate())
    ) {
        age--;
    }
    return age < 0 ? "" : String(age);
};

/* =========================================================
   ÉTAPES DU FORMULAIRE
========================================================= */
const ETAPES = [
    "Défunt",
    "Décès et arrivée",
    "Provenance et emplacement",
    "Déposants",
];

const deposantVide = () => ({
    nom: "",
    telephone: "",
    cni: "",
    lien_parente: "",
});

/* =========================================================
   LIENS DE PARENTÉ
   Les liens ajoutés via « Autre » sont conservés d'une
   session à l'autre dans le navigateur.
========================================================= */
const LIENS_PARENTE_BASE = [
    "Père",
    "Mère",
    "Époux(se)",
    "Fils",
    "Fille",
    "Frère",
    "Sœur",
    "Oncle",
    "Tante",
];

const CLE_LIENS_PARENTE = "kitthanato.liens_parente";

let liensParenteAjoutesCache = null;

const liensParenteAjoutes = () => {
    if (liensParenteAjoutesCache !== null) return liensParenteAjoutesCache;

    try {
        const valeur = JSON.parse(
            window.localStorage.getItem(CLE_LIENS_PARENTE) || "[]"
        );
        liensParenteAjoutesCache = Array.isArray(valeur)
            ? valeur.filter(
                  (lien) => typeof lien === "string" && lien.trim()
              )
            : [];
    } catch {
        liensParenteAjoutesCache = [];
    }

    return liensParenteAjoutesCache;
};

const memoriserLienParente = (lien) => {
    const texte = String(lien || "").trim();
    if (!texte) return;

    const connus = [...LIENS_PARENTE_BASE, ...liensParenteAjoutes()];
    if (connus.some((c) => c.toLowerCase() === texte.toLowerCase())) return;

    liensParenteAjoutesCache = [...liensParenteAjoutes(), texte];

    try {
        window.localStorage.setItem(
            CLE_LIENS_PARENTE,
            JSON.stringify(liensParenteAjoutesCache)
        );
    } catch {
        /* Stockage indisponible : le lien reste utilisable pour ce dépôt. */
    }
};

/* Libellé de l'emplacement : caisson structuré, sinon ancien box texte. */
const libelleCaisson = (depot) => {
    if (depot?.caisson) {
        const chambre = depot.caisson.chambre_froide?.nom;
        return chambre
            ? `${chambre} · ${depot.caisson.code}`
            : depot.caisson.code;
    }
    return depot?.box_name || "";
};

const libelleChambre = (chambre) => {
    if (!chambre) return "";
    if (chambre.type === "individuelle") return "Chambre individuelle";
    if (chambre.type === "commune") return "Chambre commune";
    return chambre.nom || "";
};

/* Ancien texte libre → vocabulaire actuel (chambre froide commune → chambre commune). */
const normaliserEmplacement = (valeur) => {
    const texte = String(valeur || "").trim();
    if (!texte) return "";
    return texte
        .replace(/chambre\s+froide\s+individuelle/i, "Chambre individuelle")
        .replace(/chambre\s+froide\s+commune/i, "Chambre commune")
        .replace(/chambre\s+froide/i, "Chambre");
};

/* Une seule représentation de l'emplacement pour la liste et la fiche. */
const infosEmplacement = (depot) => {
    if (depot?.caisson) {
        const chambre = depot.caisson.chambre_froide;
        return {
            libelle: libelleCaisson(depot),
            detail: libelleChambre(chambre),
            type: "caisson",
        };
    }

    if (depot?.box_name) {
        const ancien = [normaliserEmplacement(depot.emplacement), depot.box_name]
            .filter(Boolean)
            .join(" · ");
        return { libelle: ancien, detail: "Ancien emplacement", type: "ancien" };
    }

    const ancien = normaliserEmplacement(depot?.emplacement);
    if (ancien && !/^non attribu/i.test(ancien)) {
        return { libelle: ancien, detail: "Ancien emplacement", type: "ancien" };
    }

    return { libelle: "Non attribué", detail: "", type: "vide" };
};

function DepotCorps() {
    const getNomEnregistreur = (depot) => depot?.createur?.name || "-";

    /* =====================================================
       ÉTATS
    ===================================================== */

    const [searchParams] = useSearchParams();
    const lienDepotTraite = useRef(false);

    const [depots, setDepots] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const [selectedDepot, setSelectedDepot] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const [currentStep, setCurrentStep] = useState(1);

    /* Confirmation */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: "",
        message: "",
        confirmLabel: "Confirmer",
        type: "warning",
        onConfirm: null,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    /* Notification */
    const [notif, setNotif] = useState({
        open: false,
        type: "success",
        title: "",
        message: "",
    });

    /* Menu actions */
    const [openMenuId, setOpenMenuId] = useState(null);

    /* Professions */
    const [professions, setProfessions] = useState([]);
    const [professionRecherchee, setProfessionRecherchee] = useState("");
    const [afficherProfessions, setAfficherProfessions] = useState(false);

    /* Prestations */
    const [prestations, setPrestations] = useState([]);
    const [prestationsSelectionnees, setPrestationsSelectionnees] = useState([]);
    const [montantPrestations, setMontantPrestations] = useState(0);

    /* Services d'origine */
    const [services, setServices] = useState([]);
    const [serviceRecherche, setServiceRecherche] = useState("");
    const [afficherServices, setAfficherServices] = useState(false);

    /* Déposants */
    const [deposants, setDeposants] = useState([]);
    const [deposantCourant, setDeposantCourant] = useState(deposantVide());
    const [liensPersonnalises, setLiensPersonnalises] = useState(
        liensParenteAjoutes
    );
    const [lienAutreActif, setLienAutreActif] = useState(false);
    const [lienAutre, setLienAutre] = useState("");

    /* Box / caisson */
    const [boxOpen, setBoxOpen] = useState(false);
    const [boxDepot, setBoxDepot] = useState(null);
    const [boxCaisson, setBoxCaisson] = useState("");
    const [boxChambre, setBoxChambre] = useState("");
    const [chambresCaissons, setChambresCaissons] = useState([]);
    const [boxChargement, setBoxChargement] = useState(false);
    const [boxLoading, setBoxLoading] = useState(false);

    /* Emplacements du formulaire (chambres → caissons) */
    const [chambresFormulaire, setChambresFormulaire] = useState([]);
    const [chambreFormulaire, setChambreFormulaire] = useState("");
    const [chargementEmplacements, setChargementEmplacements] = useState(false);

    /* Chapelles du référentiel */
    const [chapelles, setChapelles] = useState([]);

    /* Enregistrement en cours (anti double-clic) */
    const [enregistrement, setEnregistrement] = useState(false);

    /* =====================================================
       FORMULAIRE
    ===================================================== */

    const initialForm = {
        code: "",          // ex: 26PA00015 (saisi)
        code_defunt: "",   // ex: NOV0001 (auto, lecture seule)
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
        caisson_id: "",
        chapelle: "",
    };

    const [formData, setFormData] = useState(initialForm);

    /* Caisson choisi dans le formulaire (chambre associée pour le libellé). */
    const caissonSelectionne = (() => {
        if (!formData.caisson_id) return null;
        for (const chambre of chambresFormulaire) {
            const caisson = (chambre.caissons || []).find(
                (c) => String(c.id) === String(formData.caisson_id)
            );
            if (caisson) return { ...caisson, chambre };
        }
        return null;
    })();

    const emplacementCalcule = caissonSelectionne
        ? `${caissonSelectionne.chambre.nom} · ${caissonSelectionne.code}`
        : formData.emplacement || "Non attribué";

    /* Le caisson proposé dépend de la chambre froide sélectionnée. */
    const chambreFormulaireChoisie = chambresFormulaire.find(
        (chambre) => String(chambre.id) === String(chambreFormulaire)
    );
    const caissonsChambreFormulaire =
        chambreFormulaireChoisie?.caissons || [];

    const chambreBoxChoisie = chambresCaissons.find(
        (chambre) => String(chambre.id) === String(boxChambre)
    );
    const caissonsBox = chambreBoxChoisie?.caissons || [];

    /* Lien de parenté : « Autre » ouvre une saisie libre. */
    const liensParenteProposes = [
        ...LIENS_PARENTE_BASE,
        ...liensPersonnalises,
    ];
    const lienParenteConnu =
        !deposantCourant.lien_parente ||
        liensParenteProposes.includes(deposantCourant.lien_parente);
    const lienParenteValeur = 
        lienAutreActif || !lienParenteConnu
            ? "__autre__"
            : deposantCourant.lien_parente;

    /* Prévisualisation du prochain code_defunt */
    const prochainDefuntPreview = useMemo(
        () => prochainCodeDefunt(depots),
        [depots]
    );

    /* =====================================================
       HELPERS MODALES
    ===================================================== */

    const showNotif = (type, title, message = "") => {
        setNotif({ open: true, type, title, message });
    };

    const closeNotif = () =>
        setNotif((prev) => ({ ...prev, open: false }));

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
       FORMAT DATE
    ===================================================== */

    const formatDateForInput = (date) => {
        if (!date) return "";
        const value = String(date);
        if (value.includes("T")) return value.split("T")[0];
        if (value.includes(" ")) return value.split(" ")[0];
        return value;
    };

    /* =====================================================
       CHARGEMENTS
    ===================================================== */

    const fetchDepots = async () => {
        try {
            setLoading(true);
            const data = await api.depots.list();
            const liste = asList(data, "depots");
            setDepots(liste);

            if (!lienDepotTraite.current) {
                lienDepotTraite.current = true;

                if (searchParams.get("nouveau") === "1") {
                    setEditingId(null);
                    setFormData((actuel) => ({
                        ...actuel,
                        code_defunt: prochainCodeDefunt(liste),
                    }));
                    setShowForm(true);
                }

                const cible = Number(searchParams.get("depot"));
                const depotCible = liste.find(
                    (depot) => Number(depot.id) === cible
                );

                if (depotCible) {
                    setSelectedDepot(depotCible);
                    setShowDetails(true);
                }
            }
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

    const chargerProfessions = async (recherche = "") => {
        try {
            const data = asList(
                await api.professions.list(recherche),
                "professions"
            );
            setProfessions(data);
        } catch (error) {
            console.error(error);
            setProfessions([]);
        }
    };

    const chargerServices = async (recherche = "") => {
        try {
            const data = asList(
                await api.services.list(recherche),
                "services"
            );
            setServices(data);
        } catch (error) {
            console.error("Erreur de chargement des services :", error);
            setServices([]);
        }
    };

    const fetchPrestations = async () => {
        try {
            const data = asList(
                await api.prestations.list(),
                "prestations"
            );
            setPrestations(data);
        } catch (error) {
            console.error(error);
            setPrestations([]);
        }
    };

    const chargerChapelles = async () => {
        try {
            const data = asList(await api.chapelles.list(), "chapelles");
            setChapelles(data);
        } catch (error) {
            console.error("Erreur de chargement des chapelles :", error);
            setChapelles([]);
        }
    };

    const chargerEmplacements = async () => {
        try {
            setChargementEmplacements(true);
            const reponse = await api.depots.caissonsDisponibles();
            setChambresFormulaire(reponse?.chambres || []);
        } catch (error) {
            console.error("Erreur de chargement des caissons :", error);
            setChambresFormulaire([]);
        } finally {
            setChargementEmplacements(false);
        }
    };

    useEffect(() => {
        fetchDepots();
        chargerProfessions();
        chargerServices();
        fetchPrestations();
        chargerChapelles();
        chargerEmplacements();
    }, []);

    /* Fermeture menu actions */
    useEffect(() => {
        const fermerMenu = () => setOpenMenuId(null);
        document.addEventListener("click", fermerMenu);
        return () =>
            document.removeEventListener("click", fermerMenu);
    }, []);

    /* Fermeture suggestions */
    useEffect(() => {
        const fermer = (e) => {
            if (e.type === "keydown") {
                if (e.key === "Escape") {
                    setAfficherProfessions(false);
                    setAfficherServices(false);
                }
                return;
            }
            if (!e.target.closest(".profession-container")) {
                setAfficherProfessions(false);
                setAfficherServices(false);
            }
        };
        document.addEventListener("mousedown", fermer);
        document.addEventListener("keydown", fermer);
        return () => {
            document.removeEventListener("mousedown", fermer);
            document.removeEventListener("keydown", fermer);
        };
    }, []);

    /* =====================================================
       TOTAL PRESTATIONS
    ===================================================== */

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

    /* =====================================================
       CHANGEMENT FORMULAIRE
    ===================================================== */

    const handleChange = (e) => {
        const { name, value } = e.target;

        /* Date de naissance → âge */
        if (name === "date_naissance") {
            setFormData((prev) => ({
                ...prev,
                date_naissance: value,
                age: ageDepuisDateNaissance(value),
            }));
            return;
        }

        /* Âge → date de naissance (approximatif) */
        if (name === "age") {
            const dateAuto = dateNaissanceDepuisAge(value);
            setFormData((prev) => ({
                ...prev,
                age: value,
                date_naissance: dateAuto || prev.date_naissance,
            }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    /* =====================================================
       PROFESSION
    ===================================================== */

    const selectionnerProfession = (profession) => {
        const nom = profession.nom || "";
        setFormData((prev) => ({ ...prev, profession: nom }));
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
            const nouvelle = creee?.nom || nom;
            setFormData((prev) => ({ ...prev, profession: nouvelle }));
            setProfessionRecherchee(nouvelle);
            setAfficherProfessions(false);
            await chargerProfessions();
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage || "Impossible d'ajouter la profession."
            );
        }
    };

    /* =====================================================
       SERVICE
    ===================================================== */

    const selectionnerService = (service) => {
        const nom = service.nom || "";
        setFormData((prev) => ({ ...prev, service_origine: nom }));
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
            const nouveau = cree?.nom || nom;
            setFormData((prev) => ({ ...prev, service_origine: nouveau }));
            setServiceRecherche(nouveau);
            setAfficherServices(false);
            await chargerServices();
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage || "Impossible d'ajouter le service."
            );
        }
    };

    /* =====================================================
       PRESTATIONS
    ===================================================== */

    /* =====================================================
       DÉPOSANTS
    ===================================================== */

    const handleDeposantChange = (e) => {
        const { name, value } = e.target;

        if (name === "lien_parente") {
            setLienAutreActif(value === "__autre__");
            setLienAutre("");
            setDeposantCourant((prev) => ({
                ...prev,
                lien_parente: value === "__autre__" ? "" : value,
            }));
            return;
        }

        setDeposantCourant((prev) => ({ ...prev, [name]: value }));
    };

    const ajouterDeposant = () => {
        if (!deposantCourant.nom.trim()) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez saisir le nom du déposant."
            );
            return;
        }

        const lienParente = lienAutreActif
            ? lienAutre.trim()
            : deposantCourant.lien_parente;

        if (lienAutreActif && !lienParente) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez préciser le lien de parenté."
            );
            return;
        }

        if (lienAutreActif) {
            memoriserLienParente(lienParente);
            setLiensPersonnalises([...liensParenteAjoutes()]);
        }

        setDeposants((prev) => [
            ...prev,
            {
                ...deposantCourant,
                nom: deposantCourant.nom.trim(),
                lien_parente: lienParente,
                statut: prev.length === 0 ? "principal" : "secondaire",
            },
        ]);
        setDeposantCourant(deposantVide());
        setLienAutreActif(false);
        setLienAutre("");
    };

    const definirPrincipal = (index) => {
        setDeposants((prev) =>
            prev.map((d, i) => ({
                ...d,
                statut: i === index ? "principal" : "secondaire",
            }))
        );
    };

    const retirerDeposant = (index) => {
        setDeposants((prev) => {
            const reste = prev.filter((_, i) => i !== index);
            if (
                reste.length > 0 &&
                !reste.some((d) => d.statut === "principal")
            ) {
                reste[0] = { ...reste[0], statut: "principal" };
            }
            return reste;
        });
    };

    const corrigerDeposant = (index) => {
        const d = deposants[index];
        const lien = d.lien_parente || "";
        const lienLibre =
            lien &&
            !LIENS_PARENTE_BASE.includes(lien) &&
            !liensPersonnalises.includes(lien);

        setDeposantCourant({
            nom: d.nom || "",
            telephone: d.telephone || "",
            cni: d.cni || "",
            lien_parente: lienLibre ? "" : lien,
        });
        setLienAutreActif(Boolean(lienLibre));
        setLienAutre(lienLibre ? lien : "");
        retirerDeposant(index);
    };

    /* =====================================================
       NAVIGATION
    ===================================================== */

    const validerEtape = (etape) => {
        const erreur = (message) => {
            showNotif("error", "Champ manquant", message);
            return false;
        };

        if (etape === 1) {
            if (!formData.code)
                return erreur("Veuillez saisir le code du dépôt.");
            if (!formData.nom.trim())
                return erreur("Veuillez saisir le nom du défunt.");
            if (!formData.sexe)
                return erreur("Veuillez sélectionner le sexe.");
            if (!formData.date_naissance && !formData.age) {
                return erreur(
                    "Veuillez renseigner la date de naissance ou l'âge."
                );
            }
        }

        if (etape === 2) {
            if (!formData.date_deces)
                return erreur("Veuillez renseigner la date du décès.");
            if (!formData.date_arrivee)
                return erreur("Veuillez renseigner la date d'arrivée.");
        }

        if (etape === 3) {
            if (!formData.provenance)
                return erreur("Veuillez sélectionner la provenance.");
            if (
                formData.provenance === "Interne" &&
                !formData.service_origine
            ) {
                return erreur(
                    "Veuillez sélectionner le service d'origine."
                );
            }
            if (
                formData.provenance === "Externe" &&
                !formData.lieu_provenance
            ) {
                return erreur(
                    "Veuillez renseigner le lieu de provenance."
                );
            }
            if (!formData.etat)
                return erreur("Veuillez sélectionner l'état du corps.");
        }

        return true;
    };

    const etapeSuivante = () => {
        if (!validerEtape(currentStep)) return;
        setCurrentStep((s) => Math.min(ETAPES.length, s + 1));
    };

    const etapePrecedente = () => {
        setCurrentStep((s) => Math.max(1, s - 1));
    };

    /* =====================================================
       RESET / NOUVEAU / FERMER
    ===================================================== */

    const resetFormulaire = () => {
        setFormData({
            ...initialForm,
            /* Prévisualisation du prochain code_defunt */
            code_defunt: prochainDefuntPreview,
        });
        setProfessionRecherchee("");
        setAfficherProfessions(false);
        setServiceRecherche("");
        setAfficherServices(false);
        setPrestationsSelectionnees([]);
        setDeposants([]);
        setDeposantCourant(deposantVide());
        setLienAutreActif(false);
        setLienAutre("");
        setChambreFormulaire("");
        setCurrentStep(1);
    };

    const openNewForm = () => {
        setEditingId(null);
        resetFormulaire();
        chargerEmplacements();
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        resetFormulaire();
    };

    /* =====================================================
       DÉPOSANTS D'UN DÉPÔT
    ===================================================== */

    const getDeposantsDepot = (depot) => {
        if (
            Array.isArray(depot?.depositants) &&
            depot.depositants.length > 0
        ) {
            return depot.depositants;
        }
        if (depot?.contact_nom) {
            return [
                {
                    nom: depot.contact_nom,
                    telephone: depot.contact_telephone,
                    cni: depot.contact_cni,
                    lien_parente: depot.lien_parente,
                    statut: "principal",
                },
            ];
        }
        return [];
    };

    /* =====================================================
       MODIFIER
    ===================================================== */

    const editDepot = (depot) => {
        setEditingId(depot.id);

        const selectedPrestations = Array.isArray(depot.prestations)
            ? depot.prestations
                  .map((p) => Number(p.id ?? p))
                  .filter(Boolean)
            : [];
        setPrestationsSelectionnees(selectedPrestations);

        setProfessionRecherchee(depot.profession || "");
        setServiceRecherche(depot.service_origine || "");
        setAfficherServices(false);

        const liste = getDeposantsDepot(depot).map((d) => ({
            nom: d.nom || "",
            telephone: d.telephone || "",
            cni: d.cni || "",
            lien_parente: d.lien_parente || "",
            statut: d.statut === "principal" ? "principal" : "secondaire",
        }));
        if (
            liste.length > 0 &&
            !liste.some((d) => d.statut === "principal")
        ) {
            liste[0].statut = "principal";
        }
        setDeposants(liste);
        setDeposantCourant(deposantVide());
        setCurrentStep(1);

        /* Le préfixe 26PA reste affiché séparément */
        const codeSansPrefixe = (depot.code || "").replace(
            new RegExp(`^${PREFIXE_ANNEE}`),
            ""
        );

        setFormData({
            code: codeSansPrefixe,
            code_defunt: depot.code_defunt || "",   // figé
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
            caisson_id: depot.caisson_id ? String(depot.caisson_id) : "",
            chapelle: depot.chapelle || "",
        });

        setChambreFormulaire(
            depot.caisson?.chambre_froide?.id
                ? String(depot.caisson.chambre_froide.id)
                : ""
        );

        chargerEmplacements();
        setShowForm(true);
    };

    /* =====================================================
       ENREGISTRER
       ⚠ On n'envoie PAS code_defunt : le backend le génère.
    ===================================================== */

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (enregistrement) return;

        if (currentStep < ETAPES.length) {
            etapeSuivante();
            return;
        }

        for (let s = 1; s < ETAPES.length; s++) {
            if (!validerEtape(s)) {
                setCurrentStep(s);
                return;
            }
        }

        let listeFinale = [...deposants];

        const lienParenteCourant = lienAutreActif
            ? lienAutre.trim()
            : deposantCourant.lien_parente;

        if (deposantCourant.nom.trim() && lienAutreActif && !lienParenteCourant) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez préciser le lien de parenté."
            );
            return;
        }

        if (deposantCourant.nom.trim()) {
            if (lienAutreActif) memoriserLienParente(lienParenteCourant);

            listeFinale.push({
                ...deposantCourant,
                nom: deposantCourant.nom.trim(),
                lien_parente: lienParenteCourant,
                statut:
                    listeFinale.length === 0 ? "principal" : "secondaire",
            });
        }

        if (listeFinale.length === 0) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez ajouter au moins un déposant."
            );
            return;
        }

        if (!listeFinale.some((d) => d.statut === "principal")) {
            listeFinale[0] = { ...listeFinale[0], statut: "principal" };
        }

        const principal = listeFinale.find(
            (d) => d.statut === "principal"
        );

        if (!principal.cni || !principal.cni.trim()) {
            showNotif(
                "error",
                "Champ manquant",
                "Le CNI du déposant principal est obligatoire."
            );
            return;
        }

        try {
            setEnregistrement(true);

            const donnees = {
                ...formData,

                /* code conservé au format 26PA00015 */
                code: `${PREFIXE_ANNEE}${formData.code}`,

                /* ❌ PAS de code_defunt dans le payload :
                   le backend le génère à la création
                   et le conserve à la modification. */

                /* Caisson choisi → le backend en dérive l'emplacement. */
                caisson_id: formData.caisson_id
                    ? Number(formData.caisson_id)
                    : null,
                emplacement: caissonSelectionne
                    ? emplacementCalcule
                    : formData.emplacement || "",

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

                depositants: listeFinale,

                contact_nom: principal.nom,
                contact_telephone: principal.telephone,
                contact_cni: principal.cni,
                lien_parente: principal.lien_parente,
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
            chargerEmplacements();
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage ||
                    error.message ||
                    "Impossible d'enregistrer le dépôt."
            );
        } finally {
            setEnregistrement(false);
        }
    };

    /* =====================================================
       BOX
    ===================================================== */

    const ouvrirBox = async (depot) => {
        if ((depot.statut || "PRÉSENT") !== "PRÉSENT") {
            showNotif(
                "error",
                "Action impossible",
                "Un caisson ne peut être attribué qu'à un corps présent."
            );
            return;
        }
        setBoxDepot(depot);
        setBoxCaisson(depot.caisson_id ? String(depot.caisson_id) : "");
        setBoxChambre(
            depot.caisson?.chambre_froide?.id
                ? String(depot.caisson.chambre_froide.id)
                : ""
        );
        setChambresCaissons([]);
        setBoxOpen(true);
        setBoxChargement(true);
        try {
            const reponse = await api.depots.caissonsDisponibles(depot.id);
            const chambres = reponse?.chambres || [];
            setChambresCaissons(chambres);

            if (!depot.caisson?.chambre_froide?.id && depot.caisson_id) {
                const chambre = chambres.find((c) =>
                    (c.caissons || []).some(
                        (caisson) =>
                            String(caisson.id) === String(depot.caisson_id)
                    )
                );
                if (chambre) setBoxChambre(String(chambre.id));
            }
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage ||
                    error.message ||
                    "Impossible de charger les caissons."
            );
            setBoxOpen(false);
            setBoxDepot(null);
        } finally {
            setBoxChargement(false);
        }
    };

    const fermerBox = () => {
        if (boxLoading) return;
        setBoxOpen(false);
        setBoxDepot(null);
        setBoxCaisson("");
        setBoxChambre("");
        setChambresCaissons([]);
    };

    const enregistrerBox = async (e) => {
        if (e) e.preventDefault();
        if (!boxCaisson) {
            showNotif(
                "error",
                "Champ manquant",
                "Veuillez sélectionner un caisson."
            );
            return;
        }
        try {
            setBoxLoading(true);
            const reponse = await api.depots.assignBox(
                boxDepot.id,
                Number(boxCaisson)
            );
            setDepots((liste) =>
                liste.map((d) =>
                    d.id === boxDepot.id
                        ? { ...d, ...(reponse?.depot || {}) }
                        : d
                )
            );
            setBoxOpen(false);
            setBoxDepot(null);
            setBoxCaisson("");
            setBoxChambre("");
            setChambresCaissons([]);
            showNotif(
                "success",
                "Caisson attribué",
                reponse?.message || "Le caisson a été attribué."
            );
            chargerEmplacements();
        } catch (error) {
            console.error(error);
            showNotif(
                "error",
                "Échec",
                error.firstMessage ||
                    error.message ||
                    "Impossible d'attribuer le caisson."
            );
        } finally {
            setBoxLoading(false);
        }
    };

    /* =====================================================
       SCELLER / DESCELLER
    ===================================================== */

    const changerScelle = (depot, sceller) => {
        if (sceller && (depot.statut || "PRÉSENT") !== "PRÉSENT") {
            showNotif(
                "error",
                "Action impossible",
                "Seul un corps présent peut être scellé."
            );
            return;
        }
        openConfirm({
            title: sceller
                ? "Sceller le corps ?"
                : "Desceller le corps ?",
            message: sceller
                ? `Le corps de "${depot.nom || ""} ${
                      depot.prenom || ""
                  }" sera scellé.\n\nPlus aucune modification ne sera possible tant que l'administrateur ne l'aura pas descellé.`
                : `Le corps de "${depot.nom || ""} ${
                      depot.prenom || ""
                  }" sera descellé et redeviendra modifiable.`,
            confirmLabel: sceller ? "Sceller" : "Desceller",
            type: "warning",
            onConfirm: async () => {
                try {
                    const res = sceller
                        ? await api.depots.sceller(depot.id)
                        : await api.depots.desceller(depot.id);
                    if (res?.depot) {
                        setSelectedDepot((prev) =>
                            prev && prev.id === depot.id
                                ? { ...prev, ...res.depot }
                                : prev
                        );
                    }
                    showNotif(
                        "success",
                        sceller ? "Corps scellé" : "Corps descellé",
                        sceller
                            ? "Le corps ne peut plus être modifié."
                            : "Le corps est de nouveau modifiable."
                    );
                    await fetchDepots();
                } catch (error) {
                    console.error(error);
                    showNotif(
                        "error",
                        "Échec",
                        error.firstMessage ||
                            error.message ||
                            "Opération impossible."
                    );
                    throw error;
                }
            },
        });
    };

    /* =====================================================
       SUPPRESSION
    ===================================================== */

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
                        error.message ||
                            "Erreur lors de la suppression."
                    );
                    throw error;
                }
            },
        });
    };

    /* =====================================================
       RECHERCHE
    ===================================================== */

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
            libelleCaisson(depot),
            depot.chapelle,
            depot.contact_nom,
            depot.statut,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return texte.includes(recherche);
    });

    const paginationDepots = usePagination(depotsFiltres, {
        tailleInitiale: 10,
        resetKey: search,
    });

    /* =====================================================
       DATES MIN / MAX
    ===================================================== */

    const aujourdHui = new Date();
    aujourdHui.setMinutes(
        aujourdHui.getMinutes() - aujourdHui.getTimezoneOffset()
    );
    const maxDate = aujourdHui.toISOString().split("T")[0];
    const minDate = maxDate;

    /* =====================================================
       AFFICHAGE
    ===================================================== */

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
                        placeholder="Rechercher par code, nom, provenance, box..."
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
                                <th>Code défunt</th>
                                <th>Code dépôt</th>
                                <th>Nom du défunt</th>
                                <th>Date décès</th>
                                <th>Provenance</th>
                                <th>État</th>
                                <th>Emplacement</th>
                                <th>Chapelle</th>
                                <th>Déposant</th>
                                <th>Enregistré par</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="12" className="table-loading">
                                        Chargement des dépôts...
                                    </td>
                                </tr>
                            ) : depotsFiltres.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="table-empty">
                                        Aucun dépôt trouvé.
                                    </td>
                                </tr>
                            ) : (
                                paginationDepots.items.map((depot) => {
                                    const emplacement = infosEmplacement(depot);
                                    const peutAttribuer =
                                        emplacement.type !== "caisson" &&
                                        !depot.scelle &&
                                        (depot.statut || "PRÉSENT") ===
                                            "PRÉSENT" &&
                                        hasPermission("depots.update");

                                    return (
                                    <tr
                                        key={depot.id}
                                        className={
                                            depot.scelle ? "ligne-scellee" : ""
                                        }
                                    >
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

                                        <td className="emplacement-cell">
                                            <span
                                                className={`emplacement-badge ${emplacement.type}`}
                                            >
                                                {emplacement.libelle}
                                            </span>
                                            {emplacement.detail && (
                                                <span className="emplacement-detail">
                                                    {emplacement.detail}
                                                </span>
                                            )}
                                            {peutAttribuer && (
                                                <button
                                                    type="button"
                                                    className="emplacement-attribuer"
                                                    onClick={() => ouvrirBox(depot)}
                                                    title="Attribuer un caisson"
                                                >
                                                    + Attribuer
                                                </button>
                                            )}
                                        </td>

                                        <td>
                                            <span className="chapelle-badge">
                                                {depot.chapelle || "-"}
                                            </span>
                                        </td>

                                        <td className="deposant-cell">
                                            {depot.contact_nom || "-"}
                                            <br />
                                            <span>
                                                {depot.contact_telephone || ""}
                                            </span>
                                            <br />
                                            <span>
                                                CNI :{" "}
                                                {depot.contact_cni || ""}
                                            </span>
                                        </td>

                                        <td className="enregistreur-cell">
                                            {getNomEnregistreur(depot)}
                                        </td>

                                        <td>
                                            <span
                                                className={`depot-status ${
                                                    depot.scelle
                                                        ? "status-scelle"
                                                        : depot.statut === "SORTI"
                                                        ? "status-sorti"
                                                        : depot.statut === "TRANSFÉRÉ"
                                                        ? "status-transfere"
                                                        : "status-present"
                                                }`}
                                            >
                                                {depot.scelle
                                                    ? "🔒 SCELLÉ"
                                                    : depot.statut ||
                                                      "PRÉSENT"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="actions-menu-container">
                                                <button
                                                    type="button"
                                                    className="actions-menu-trigger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(
                                                            openMenuId ===
                                                                depot.id
                                                                ? null
                                                                : depot.id
                                                        );
                                                    }}
                                                >
                                                    ⋮
                                                </button>

                                                {openMenuId === depot.id && (
                                                    <div
                                                        className="actions-menu-dropdown"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
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

                                                        {hasPermission("depots.sceller") &&
                                                            (depot.scelle ||
                                                                (depot.statut ||
                                                                    "PRÉSENT") ===
                                                                    "PRÉSENT") && (
                                                                <button
                                                                    type="button"
                                                                    className="actions-menu-item seal"
                                                                    onClick={() => {
                                                                        changerScelle(
                                                                            depot,
                                                                            !depot.scelle
                                                                        );
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    {depot.scelle
                                                                        ? "🔓 Desceller le corps"
                                                                        : "🔒 Sceller le corps"}
                                                                </button>
                                                            )}

                                                        {!depot.scelle &&
                                                            (depot.statut ||
                                                                "PRÉSENT") ===
                                                                "PRÉSENT" &&
                                                            hasPermission(
                                                                "depots.update"
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    className="actions-menu-item box"
                                                                    onClick={() => {
                                                                        ouvrirBox(depot);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    📦 Attribuer un caisson
                                                                </button>
                                                            )}

                                                        {!depot.scelle &&
                                                            hasPermission(
                                                                "depots.update"
                                                            ) && (
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

                                                        {!depot.scelle &&
                                                            hasPermission(
                                                                "depots.delete"
                                                            ) && (
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && depotsFiltres.length > 0 && (
                    <Pagination
                        page={paginationDepots.page}
                        pages={paginationDepots.pages}
                        total={paginationDepots.total}
                        taille={paginationDepots.taille}
                        onPage={paginationDepots.setPage}
                        onTaille={paginationDepots.setTaille}
                        element="dépôt"
                    />
                )}
            </div>

            {/* FORMULAIRE */}
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

                        {/* ÉTAPES */}
                        <div className="wizard-steps">
                            {ETAPES.map((titre, i) => {
                                const numero = i + 1;
                                const etat =
                                    numero === currentStep
                                        ? "active"
                                        : numero < currentStep
                                        ? "done"
                                        : "";
                                return (
                                    <div
                                        key={titre}
                                        className={`wizard-step ${etat}`}
                                    >
                                        <span className="wizard-step-number">
                                            {numero < currentStep
                                                ? "✓"
                                                : numero}
                                        </span>
                                        <span className="wizard-step-label">
                                            {titre}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <form
                            className="depot-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            {/* ÉTAPE 1 */}
                            {currentStep === 1 && (
                                <div className="form-section">
                                    <div className="section-heading">
                                        01 — Identification du défunt
                                    </div>

                                    <div className="form-grid">
                                        {/* CODE DÉPÔT (26PA00015) — SAISI */}
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
                                                    placeholder="00015"
                                                    maxLength="7"
                                                />
                                            </div>
                                        </div>

                                        {/* CODE DÉFUNT — AUTO, LECTURE SEULE */}
                                        <div className="form-group">
                                            <label>Code du défunt</label>
                                            <input
                                                type="text"
                                                name="code_defunt"
                                                value={
                                                    formData.code_defunt ||
                                                    prochainDefuntPreview
                                                }
                                                readOnly
                                                disabled
                                                style={{
                                                    background: "#f4f2f8",
                                                    cursor: "not-allowed",
                                                    fontWeight: 700,
                                                }}
                                                title="Généré automatiquement (mois + numéro)"
                                            />
                                            
                                        </div>

                                        <div className="form-group">
                                            <label>Nom *</label>
                                            <input
                                                type="text"
                                                name="nom"
                                                value={formData.nom}
                                                onChange={handleChange}
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
                                            >
                                                <option value="">Sélectionner</option>
                                                <option value="Masculin">Masculin</option>
                                                <option value="Féminin">Féminin</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Profession</label>
                                            <div className="profession-container">
                                                <input
                                                    type="text"
                                                    value={professionRecherchee}
                                                    onChange={(e) => {
                                                        const valeur = e.target.value;
                                                        setProfessionRecherchee(valeur);
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            profession: valeur,
                                                        }));
                                                        setAfficherProfessions(true);
                                                        chargerProfessions(valeur);
                                                    }}
                                                    onFocus={() => {
                                                        setAfficherProfessions(true);
                                                        chargerProfessions(professionRecherchee);
                                                    }}
                                                    autoComplete="off"
                                                    placeholder="Rechercher..."
                                                />
                                                {afficherProfessions && (
                                                    <div className="profession-suggestions">
                                                        {professions.map((p) => (
                                                            <button
                                                                type="button"
                                                                key={p.id}
                                                                className="profession-option"
                                                                onClick={() =>
                                                                    selectionnerProfession(p)
                                                                }
                                                            >
                                                                {p.nom}
                                                            </button>
                                                        ))}
                                                        {professionRecherchee.trim() && (
                                                            <button
                                                                type="button"
                                                                className="profession-ajouter"
                                                                onClick={ajouterProfession}
                                                            >
                                                                Ajouter «{" "}
                                                                {professionRecherchee.trim()}
                                                                »
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* DATE NAISSANCE */}
                                        <div className="form-group">
                                            <label>Date de naissance</label>
                                            <input
                                                type="date"
                                                name="date_naissance"
                                                value={formData.date_naissance}
                                                max={maxDate}
                                                onChange={handleChange}
                                            />
                                            <small
                                                style={{
                                                    color: "#8b8194",
                                                    fontSize: 11,
                                                    marginTop: 4,
                                                    display: "block",
                                                }}
                                            >
                                                Remplie automatiquement
                                                lorsque l'âge est saisi
                                            </small>
                                        </div>

                                        {/* ÂGE → recalcule la date */}
                                        <div className="form-group">
                                            <label>Âge</label>
                                            <input
                                                type="number"
                                                name="age"
                                                value={formData.age}
                                                onChange={handleChange}
                                                min="0"
                                                max="150"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ÉTAPE 2 */}
                            {currentStep === 2 && (
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
                                                min={formData.date_deces || undefined}
                                                max={maxDate}
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
                                                <option value="">Sélectionner</option>
                                                <option value="Conservation">Conservation</option>
                                                <option value="Préparation">Préparation</option>
                                                <option value="Transfert">Transfert</option>
                                                <option value="Autre">Autre</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ÉTAPE 3 */}
                            {currentStep === 3 && (
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
                                            >
                                                <option value="">Sélectionner</option>
                                                <option value="Interne">Interne</option>
                                                <option value="Externe">Externe</option>
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
                                                    />
                                                    {afficherServices && (
                                                        <div className="profession-suggestions">
                                                            {services.map((s) => (
                                                                <button
                                                                    type="button"
                                                                    key={s.id}
                                                                    className="profession-option"
                                                                    onClick={() =>
                                                                        selectionnerService(s)
                                                                    }
                                                                >
                                                                    {s.nom}
                                                                </button>
                                                            ))}
                                                            {serviceRecherche.trim() && (
                                                                <button
                                                                    type="button"
                                                                    className="profession-ajouter"
                                                                    onClick={ajouterService}
                                                                >
                                                                    Ajouter «{" "}
                                                                    {serviceRecherche.trim()}
                                                                    »
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {formData.provenance === "Externe" && (
                                            <div className="form-group">
                                                <label>Lieu de provenance *</label>
                                                <input
                                                    type="text"
                                                    name="lieu_provenance"
                                                    value={formData.lieu_provenance}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>État du corps *</label>
                                            <select
                                                name="etat"
                                                value={formData.etat}
                                                onChange={handleChange}
                                            >
                                                <option value="">Sélectionner</option>
                                                <option value="Bon état">Bon état</option>
                                                <option value="État moyen">État moyen</option>
                                                <option value="Dégradé">Dégradé</option>
                                                <option value="Altéré">Altéré</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Chambre froide</label>
                                            <select
                                                value={chambreFormulaire}
                                                onChange={(e) => {
                                                    setChambreFormulaire(
                                                        e.target.value
                                                    );
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        caisson_id: "",
                                                    }));
                                                }}
                                                disabled={chargementEmplacements}
                                            >
                                                <option value="">
                                                    {chargementEmplacements
                                                        ? "Chargement..."
                                                        : "— Sélectionner une chambre —"}
                                                </option>
                                                {chambresFormulaire.map(
                                                    (chambre) => (
                                                        <option
                                                            key={chambre.id}
                                                            value={chambre.id}
                                                        >
                                                            {chambre.nom} (
                                                            {chambre.type ===
                                                            "individuelle"
                                                                ? "individuelle"
                                                                : "commune"}
                                                            )
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Caisson</label>
                                            <select
                                                name="caisson_id"
                                                value={formData.caisson_id}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        caisson_id:
                                                            e.target.value,
                                                    }))
                                                }
                                                disabled={
                                                    chargementEmplacements ||
                                                    !chambreFormulaireChoisie
                                                }
                                            >
                                                <option value="">
                                                    {chargementEmplacements
                                                        ? "Chargement des caissons..."
                                                        : !chambreFormulaireChoisie
                                                        ? "— Sélectionnez d'abord une chambre —"
                                                        : "— Non attribué (à attribuer plus tard) —"}
                                                </option>
                                                {caissonsChambreFormulaire.map(
                                                    (caisson) => (
                                                        <option
                                                            key={caisson.id}
                                                            value={caisson.id}
                                                            disabled={
                                                                !caisson.disponible &&
                                                                String(
                                                                    caisson.id
                                                                ) !==
                                                                    String(
                                                                        formData.caisson_id
                                                                    )
                                                            }
                                                        >
                                                            {caisson.code}
                                                            {caisson.occupants >
                                                            0
                                                                ? caisson.capacite ===
                                                                  1
                                                                    ? " — occupé"
                                                                    : ` — ${caisson.occupants} corps`
                                                                : " — libre"}
                                                        </option>
                                                    )
                                                )}
                                            </select>

                                            <small className="form-help">
                                                {caissonSelectionne
                                                    ? `Emplacement retenu : ${emplacementCalcule}`
                                                    : chambreFormulaireChoisie
                                                    ? "Le corps apparaîtra « Non attribué » dans la liste jusqu'à l'attribution d'un caisson."
                                                    : "Sélectionnez une chambre froide, puis un caisson, ou enregistrez le corps sans attribution."}
                                            </small>

                                            {!chargementEmplacements &&
                                                chambresFormulaire.length ===
                                                    0 && (
                                                    <small className="form-help form-help-warning">
                                                        Aucun caisson actif.
                                                        Créez-en dans
                                                        Emplacements, ou
                                                        enregistrez le corps
                                                        sans caisson.
                                                    </small>
                                                )}
                                        </div>

                                        <div className="form-group">
                                            <label>Chapelle</label>
                                            <select
                                                name="chapelle"
                                                value={formData.chapelle}
                                                onChange={handleChange}
                                            >
                                                <option value="Aucune">
                                                    Aucune
                                                </option>
                                                {chapelles.map((chapelle) => (
                                                    <option
                                                        key={chapelle.id}
                                                        value={chapelle.nom}
                                                    >
                                                        {chapelle.nom}
                                                    </option>
                                                ))}
                                                {formData.chapelle &&
                                                    formData.chapelle !==
                                                        "Aucune" &&
                                                    !chapelles.some(
                                                        (c) =>
                                                            c.nom ===
                                                            formData.chapelle
                                                    ) && (
                                                        <option
                                                            value={
                                                                formData.chapelle
                                                            }
                                                        >
                                                            {formData.chapelle}
                                                        </option>
                                                    )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ÉTAPE 4 */}
                            {currentStep === 4 && (
                                <div className="form-section">
                                    <div className="section-heading">
                                        04 — Déposants et contacts
                                    </div>

                                    {deposants.length > 0 && (
                                        <div className="deposants-list">
                                            {deposants.map((d, index) => (
                                                <div
                                                    key={index}
                                                    className={`deposant-card ${d.statut}`}
                                                >
                                                    <div className="deposant-card-info">
                                                        <strong>{d.nom}</strong>
                                                        <span>
                                                            {d.telephone || "Téléphone non renseigné"}
                                                            {d.cni ? ` • CNI : ${d.cni}` : ""}
                                                            {d.lien_parente ? ` • ${d.lien_parente}` : ""}
                                                        </span>
                                                    </div>

                                                    <label className="deposant-radio">
                                                        <input
                                                            type="radio"
                                                            name="deposant_principal"
                                                            checked={d.statut === "principal"}
                                                            onChange={() => definirPrincipal(index)}
                                                        />
                                                        Déposant principal
                                                    </label>

                                                    <span className={`deposant-badge ${d.statut}`}>
                                                        {d.statut === "principal"
                                                            ? "PRINCIPAL"
                                                            : "SECONDAIRE"}
                                                    </span>

                                                    <div className="deposant-card-actions">
                                                        <button
                                                            type="button"
                                                            className="deposant-btn"
                                                            onClick={() => corrigerDeposant(index)}
                                                        >
                                                            ✏
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="deposant-btn danger"
                                                            onClick={() => retirerDeposant(index)}
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="deposant-subtitle">
                                        {deposants.length === 0
                                            ? "Déposant principal"
                                            : `Déposant n° ${deposants.length + 1} (secondaire)`}
                                    </div>

                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Nom du déposant *</label>
                                            <input
                                                type="text"
                                                name="nom"
                                                value={deposantCourant.nom}
                                                onChange={handleDeposantChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Téléphone</label>
                                            <input
                                                type="tel"
                                                name="telephone"
                                                value={deposantCourant.telephone}
                                                onChange={handleDeposantChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>CNI du déposant</label>
                                            <input
                                                type="text"
                                                name="cni"
                                                value={deposantCourant.cni}
                                                onChange={handleDeposantChange}
                                                placeholder="Numéro CNI"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Lien de parenté</label>
                                            <select
                                                name="lien_parente"
                                                value={lienParenteValeur}
                                                onChange={handleDeposantChange}
                                            >
                                                <option value="">Sélectionner</option>
                                                {LIENS_PARENTE_BASE.map((lien) => (
                                                    <option
                                                        key={lien}
                                                        value={lien}
                                                    >
                                                        {lien}
                                                    </option>
                                                ))}
                                                {liensPersonnalises.map((lien) => (
                                                    <option
                                                        key={lien}
                                                        value={lien}
                                                    >
                                                        {lien}
                                                    </option>
                                                ))}
                                                <option value="__autre__">
                                                    Autre…
                                                </option>
                                            </select>

                                            {lienAutreActif && (
                                                <input
                                                    type="text"
                                                    value={lienAutre}
                                                    onChange={(e) =>
                                                        setLienAutre(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Précisez le lien de parenté"
                                                    maxLength={100}
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="button-add-deposant"
                                        onClick={ajouterDeposant}
                                    >
                                         Ajouter ce déposant
                                    </button>
                                </div>
                            )}

                            {/* BOUTONS */}
                            <div className="form-buttons">
                                <button
                                    type="button"
                                    className="button-cancel"
                                    onClick={closeForm}
                                >
                                    Annuler
                                </button>

                                {currentStep > 1 && (
                                    <button
                                        type="button"
                                        className="button-cancel"
                                        onClick={etapePrecedente}
                                    >
                                        ← Précédent
                                    </button>
                                )}

                                {currentStep < ETAPES.length ? (
                                    <button
                                        key="btn-suivant"
                                        type="button"
                                        className="button-save"
                                        onClick={etapeSuivante}
                                    >
                                        Suivant →
                                    </button>
                                ) : (
                                    <button
                                        key="btn-enregistrer"
                                        type="submit"
                                        className="button-save"
                                        disabled={enregistrement}
                                    >
                                        {enregistrement
                                            ? "Enregistrement..."
                                            : editingId
                                            ? "Enregistrer les modifications"
                                            : "Enregistrer le dépôt"}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CAISSON */}
            {boxOpen && boxDepot && (
                <div className="modal-overlay">
                    <div className="box-modal">
                        <div className="modal-header">
                            <h2>Attribuer un caisson</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={fermerBox}
                            >
                                ×
                            </button>
                        </div>
                        <form className="box-modal-body" onSubmit={enregistrerBox}>
                            <p className="box-modal-info">
                                {boxDepot.nom} {boxDepot.prenom} — {boxDepot.code}
                            </p>
                            <div className="form-group">
                                <label>Chambre froide *</label>
                                <select
                                    value={boxChambre}
                                    onChange={(e) => {
                                        setBoxChambre(e.target.value);
                                        setBoxCaisson("");
                                    }}
                                    disabled={boxChargement || boxLoading}
                                    autoFocus
                                >
                                    <option value="">
                                        {boxChargement
                                            ? "Chargement..."
                                            : "— Sélectionner une chambre —"}
                                    </option>
                                    {chambresCaissons.map((chambre) => (
                                        <option
                                            key={chambre.id}
                                            value={chambre.id}
                                        >
                                            {chambre.nom} (
                                            {chambre.type === "individuelle"
                                                ? "individuelle"
                                                : "commune"}
                                            )
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Caisson *</label>
                                <select
                                    value={boxCaisson}
                                    onChange={(e) => setBoxCaisson(e.target.value)}
                                    disabled={
                                        boxChargement ||
                                        boxLoading ||
                                        !chambreBoxChoisie
                                    }
                                >
                                    <option value="">
                                        {boxChargement
                                            ? "Chargement..."
                                            : !chambreBoxChoisie
                                            ? "— Sélectionnez d'abord une chambre —"
                                            : "— Sélectionner un caisson —"}
                                    </option>
                                    {caissonsBox.map((caisson) => (
                                        <option
                                            key={caisson.id}
                                            value={caisson.id}
                                            disabled={
                                                !caisson.disponible &&
                                                caisson.id !== boxDepot.caisson_id
                                            }
                                        >
                                            {caisson.code}
                                            {caisson.occupants > 0
                                                ? caisson.capacite === 1
                                                    ? " — occupé"
                                                    : ` — ${caisson.occupants} corps`
                                                : " — libre"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!boxChargement && chambresCaissons.length === 0 && (
                                <p className="box-modal-vide">
                                    Aucun caisson actif. Créez-en dans Emplacements.
                                </p>
                            )}
                            <div className="form-buttons">
                                <button
                                    type="button"
                                    className="button-cancel"
                                    onClick={fermerBox}
                                    disabled={boxLoading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="button-save"
                                    disabled={
                                        boxLoading || boxChargement || !boxCaisson
                                    }
                                >
                                    {boxLoading ? "Enregistrement..." : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAILS */}
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
                                        {selectedDepot.nom} {selectedDepot.prenom}
                                    </h3>
                                    <p>Code : {selectedDepot.code}</p>
                                    <p>
                                        Code défunt :{" "}
                                        {selectedDepot.code_defunt || "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Profession</label>
                                    <span>{selectedDepot.profession || "-"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Âge</label>
                                    <span>{selectedDepot.age || "-"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Date décès</label>
                                    <span>
                                        {selectedDepot.date_deces
                                            ? formatDateForInput(selectedDepot.date_deces)
                                            : "-"}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Provenance</label>
                                    <span>{selectedDepot.provenance || "-"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Emplacement</label>
                                    <span>{infosEmplacement(selectedDepot).libelle}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Type de chambre</label>
                                    <span>
                                        {infosEmplacement(selectedDepot).detail || "-"}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Chapelle</label>
                                    <span>{selectedDepot.chapelle || "-"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Scellé</label>
                                    <span>
                                        {selectedDepot.scelle
                                            ? `🔒 Oui, par ${
                                                  selectedDepot.scelleur?.name || "-"
                                              }${
                                                  selectedDepot.scelle_le
                                                      ? " le " +
                                                        new Date(
                                                            selectedDepot.scelle_le
                                                        ).toLocaleString("fr-FR")
                                                      : ""
                                              }`
                                            : "Non"}
                                    </span>
                                </div>
                            </div>

                            <div className="details-deposants">
                                <h4>
                                    Déposants (
                                    {getDeposantsDepot(selectedDepot).length})
                                </h4>

                                {getDeposantsDepot(selectedDepot).length === 0 ? (
                                    <p className="details-deposants-vide">
                                        Aucun déposant enregistré.
                                    </p>
                                ) : (
                                    getDeposantsDepot(selectedDepot)
                                        .slice()
                                        .sort((a, b) =>
                                            a.statut === "principal"
                                                ? -1
                                                : b.statut === "principal"
                                                ? 1
                                                : 0
                                        )
                                        .map((d, index) => (
                                            <div
                                                key={d.id || index}
                                                className={`details-deposant-card ${
                                                    d.statut === "principal"
                                                        ? "principal"
                                                        : "secondaire"
                                                }`}
                                            >
                                                <div className="details-deposant-top">
                                                    <strong>{d.nom || "-"}</strong>
                                                    <span
                                                        className={`deposant-badge ${
                                                            d.statut === "principal"
                                                                ? "principal"
                                                                : "secondaire"
                                                        }`}
                                                    >
                                                        {d.statut === "principal"
                                                            ? "PRINCIPAL"
                                                            : "SECONDAIRE"}
                                                    </span>
                                                </div>
                                                <div className="details-deposant-line">
                                                    <label>Téléphone</label>
                                                    <span>{d.telephone || "-"}</span>
                                                </div>
                                                <div className="details-deposant-line">
                                                    <label>CNI</label>
                                                    <span>{d.cni || "-"}</span>
                                                </div>
                                                <div className="details-deposant-line">
                                                    <label>Lien de parenté</label>
                                                    <span>{d.lien_parente || "-"}</span>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>

                            <label className="enregistre">Enregistré par : </label>
                            <span className="enregistre">
                                {getNomEnregistreur(selectedDepot)}
                            </span>
                            <span className="day">
                                {selectedDepot.created_at
                                    ? new Date(
                                          selectedDepot.created_at
                                      ).toLocaleString("fr-FR")
                                    : "-"}
                            </span>
                            <br />
                            <label className="enregistre">
                                Dernière modification par :{" "}
                            </label>
                            <span className="enregistre">
                                {selectedDepot?.modificateur?.name || "-"}
                            </span>
                            <span className="days">
                                {selectedDepot.updated_at
                                    ? new Date(
                                          selectedDepot.updated_at
                                      ).toLocaleString("fr-FR")
                                    : "-"}
                            </span>

                            <div className="details-actions">
                                {hasPermission("depots.sceller") &&
                                    (selectedDepot.scelle ||
                                        (selectedDepot.statut || "PRÉSENT") ===
                                            "PRÉSENT") && (
                                        <button
                                            type="button"
                                            className="button-cancel"
                                            onClick={() =>
                                                changerScelle(
                                                    selectedDepot,
                                                    !selectedDepot.scelle
                                                )
                                            }
                                        >
                                            {selectedDepot.scelle
                                                ? "🔓 Desceller"
                                                : "🔒 Sceller"}
                                        </button>
                                    )}

                                {!selectedDepot.scelle &&
                                    hasPermission("depots.update") && (
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

                                {!selectedDepot.scelle &&
                                    hasPermission("depots.delete") && (
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

            {/* CONFIRMATION */}
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

            {/* NOTIFICATION */}
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