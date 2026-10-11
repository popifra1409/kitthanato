import { useEffect, useMemo, useState } from "react";
import "./PlanningLevees.css";
import api, { asList } from "../services/api";

/* =====================================================
   OUTILS DATE
===================================================== */

/** Retourne le lundi de la semaine contenant `date` */
const getLundi = (date) => {
    const d = new Date(date);
    const jour = d.getDay();
    const diff = jour === 0 ? -6 : 1 - jour;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Retourne le dimanche de la semaine contenant `date` */
const getDimanche = (date) => {
    const lundi = getLundi(date);
    const d = new Date(lundi);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
};

/** Formate une date en YYYY-MM-DD (sans timezone) */
const formatDatePourComparaison = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const j = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${j}`;
};

/** Affiche une plage de dates en français */
const formatPlage = (debut, fin) => {
    const opts = { day: "2-digit", month: "long", year: "numeric" };
    return `${debut.toLocaleDateString("fr-FR", opts)} → ${fin.toLocaleDateString(
        "fr-FR",
        opts
    )}`;
};

/* =====================================================
   ⚠️ CHAPELLES AUTORISÉES POUR LE PLANNING DES LEVÉES
===================================================== */

const CHAPELLES_AUTORISEES = [
    "petite chapelle",
    "grande chapelle",
];

/**
 * Vérifie si la chapelle est autorisée pour le planning
 * (insensible à la casse et aux accents)
 */
const chapelleAutorisee = (chapelle) => {
    if (!chapelle) return false;

    const valeur = String(chapelle)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return CHAPELLES_AUTORISEES.some((autorisee) =>
        valeur.includes(autorisee)
    );
};

/* =====================================================
   COMPOSANT
===================================================== */

function PlanningLevees() {
    const [levees, setLevees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [chapelleFilter, setChapelleFilter] = useState("TOUTES");

    const [error, setError] = useState("");

    /* ---------- Semaine de référence (offset en semaines) ---------- */
    const [offsetSemaine, setOffsetSemaine] = useState(0);

    /* =====================================================
       CALCUL DE LA SEMAINE AFFICHÉE
    ===================================================== */

    const semaine = useMemo(() => {
        const aujourdHui = new Date();
        const reference = new Date(aujourdHui);
        reference.setDate(reference.getDate() + offsetSemaine * 7);

        const lundi = getLundi(reference);
        const dimanche = getDimanche(reference);

        return {
            lundi,
            dimanche,
            lundiStr: formatDatePourComparaison(lundi),
            dimancheStr: formatDatePourComparaison(dimanche),
        };
    }, [offsetSemaine]);

    /* =====================================================
       NORMALISER UN STATUT
    ===================================================== */

    const normaliserStatut = (statut) => {
        return String(statut || "")
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    /* =====================================================
       VÉRIFIER SI LA SORTIE EST TERMINÉE
    ===================================================== */

    const sortieEstTerminee = (levee) => {
        const statutSortie = normaliserStatut(levee?.sortie?.statut);
        return (
            statutSortie === "TERMINE" ||
            statutSortie === "TERMINEE" ||
            statutSortie === "VALIDE" ||
            statutSortie === "VALIDEE"
        );
    };

    /* =====================================================
       VÉRIFIER SI LA DATE + HEURE SONT PASSÉES
    ===================================================== */

    const leveeEstPassee = (levee) => {
        const dateLevee = getDateLevee(levee);
        const heureLevee = getHeureLevee(levee);

        if (!dateLevee) return false;

        const dateStr = String(dateLevee).substring(0, 10);
        const heureStr = heureLevee
            ? String(heureLevee).substring(0, 5)
            : "00:00";

        const dateHeureLevee = new Date(`${dateStr}T${heureStr}:00`);

        if (Number.isNaN(dateHeureLevee.getTime())) return false;

        return dateHeureLevee < new Date();
    };

    /* =====================================================
       CHARGER LES LEVÉES
    ===================================================== */

    const chargerLevees = async () => {
        try {
            setLoading(true);
            setError("");

            const liste = asList(await api.levees.list());

            setLevees(liste);
        } catch (error) {
            console.error("ERREUR CHARGEMENT LEVÉES :", error);
            setError("Impossible de charger le planning des levées.");
            setLevees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        chargerLevees();
    }, []);

    /* =====================================================
       GETTERS
    ===================================================== */

    const getSortie = (levee) => levee?.sortie || null;

    const getDepot = (levee) =>
        levee?.sortie?.depot || levee?.depot || null;

    const getNomDefunt = (levee) => {
        const depot = getDepot(levee);
        if (!depot) return "—";

        const nom = `${depot.nom || ""} ${depot.prenom || ""}`.trim();
        return nom || "—";
    };

    const getCode = (levee) => {
        const depot = getDepot(levee);
        return depot?.code || levee?.code || "—";
    };

    const getChapelle = (levee) => {
        const sortie = getSortie(levee);
        const depot = getDepot(levee);

        return (
            levee?.chapelle ||
            sortie?.chapelle ||
            depot?.chapelle ||
            "—"
        );
    };

    const getDateLevee = (levee) => {
        const sortie = getSortie(levee);

        return (
            levee?.date ||
            levee?.date_levee ||
            levee?.dateLevee ||
            sortie?.date ||
            ""
        );
    };

    const getHeureLevee = (levee) => {
        const sortie = getSortie(levee);

        return (
            levee?.heure ||
            levee?.heure_levee ||
            levee?.heureLevee ||
            sortie?.heure ||
            ""
        );
    };

    /* =====================================================
       STATUT DE LA LEVÉE (avec TERMINÉ auto)
    ===================================================== */

    const getStatutLevee = (levee) => {
        if (leveeEstPassee(levee)) {
            return "TERMINÉ";
        }

        const statut = normaliserStatut(levee?.statut);

        if (statut.includes("CONFIRM")) return "CONFIRMÉ";
        if (statut.includes("ATTENTE")) return "EN ATTENTE";
        if (statut.includes("TERMIN")) return "TERMINÉ";

        return "PLANIFIÉ";
    };

    const getStatutClass = (statut) => {
        const v = normaliserStatut(statut);

        if (v.includes("TERMIN")) return "termine";
        if (v.includes("CONFIRM")) return "confirme";
        if (v.includes("ATTENTE")) return "attente";

        return "planifie";
    };

    const afficherDate = (date) => {
        if (!date) return "—";

        const valeur = String(date);

        if (/^\d{4}-\d{2}-\d{2}/.test(valeur)) {
            const [annee, mois, jour] = valeur.substring(0, 10).split("-");
            return `${jour}/${mois}/${annee}`;
        }

        const resultat = new Date(date);
        if (Number.isNaN(resultat.getTime())) return "—";

        return resultat.toLocaleDateString("fr-FR");
    };

    const afficherHeure = (heure) => {
        if (!heure) return "--:--";
        return String(heure).substring(0, 5);
    };

    /* =====================================================
       EXTRAIRE LA DATE COMPARABLE
    ===================================================== */

    const getDateComparable = (levee) => {
        const date = getDateLevee(levee);
        if (!date) return "";
        return String(date).substring(0, 10);
    };

    /* =====================================================
       ⚠️ FILTRER PAR SEMAINE + SORTIE TERMINÉE + CHAPELLE
    ===================================================== */

    const leveesDeLaSemaine = useMemo(() => {
        return levees.filter((levee) => {
            /* 1. Doit correspondre à une sortie terminée */
            if (!sortieEstTerminee(levee)) return false;

            /* 2. Doit être dans la semaine affichée */
            const dateLevee = getDateComparable(levee);
            if (!dateLevee) return false;

            const dansSemaine =
                dateLevee >= semaine.lundiStr &&
                dateLevee <= semaine.dimancheStr;

            if (!dansSemaine) return false;

            /* 3. ⚠️ La chapelle doit être autorisée
                  (Petite chapelle OU Grande chapelle) */
            const chapelle = getChapelle(levee);
            if (!chapelleAutorisee(chapelle)) return false;

            return true;
        });
    }, [levees, semaine]);

    /* =====================================================
       CHAPELLES DISPONIBLES DANS LA SEMAINE
    ===================================================== */

    const chapelles = useMemo(() => {
        const liste = leveesDeLaSemaine
            .map((levee) => getChapelle(levee))
            .filter((c) => c && c !== "—");

        return [...new Set(liste)].sort((a, b) => a.localeCompare(b));
    }, [leveesDeLaSemaine]);

    /* =====================================================
       FILTRES + TRI
    ===================================================== */

    const leveesFiltrees = useMemo(() => {
        const recherche = search.toLowerCase().trim();

        const resultat = leveesDeLaSemaine.filter((levee) => {
            const defunt = getNomDefunt(levee).toLowerCase();
            const code = getCode(levee).toLowerCase();
            const chapelle = getChapelle(levee).toLowerCase();
            const statut = getStatutLevee(levee).toLowerCase();

            const correspondRecherche =
                !recherche ||
                defunt.includes(recherche) ||
                code.includes(recherche) ||
                chapelle.includes(recherche) ||
                statut.includes(recherche);

            const correspondChapelle =
                chapelleFilter === "TOUTES" ||
                getChapelle(levee) === chapelleFilter;

            return correspondRecherche && correspondChapelle;
        });

        /* Tri : non-terminées d'abord, terminées en bas */
        return resultat.sort((a, b) => {
            const aTermine = getStatutLevee(a) === "TERMINÉ";
            const bTermine = getStatutLevee(b) === "TERMINÉ";

            if (aTermine !== bTermine) {
                return aTermine ? 1 : -1;
            }

            const dateA = getDateComparable(a);
            const dateB = getDateComparable(b);

            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }

            const heureA = getHeureLevee(a) || "";
            const heureB = getHeureLevee(b) || "";

            return heureA.localeCompare(heureB);
        });
    }, [leveesDeLaSemaine, search, chapelleFilter]);

    /* =====================================================
       NAVIGATION SEMAINES
    ===================================================== */

    const semainePrecedente = () => setOffsetSemaine((v) => v - 1);
    const semaineSuivante = () => setOffsetSemaine((v) => v + 1);
    const semaineActuelle = () => setOffsetSemaine(0);

    const estSemaineActuelle = offsetSemaine === 0;

    /* =====================================================
       ACTUALISER
    ===================================================== */

    const actualiser = () => chargerLevees();

    /* =====================================================
       AFFICHAGE
    ===================================================== */

    return (
        <div className="levees-page">

            {/* HEADER */}
            <header className="levees-header">
                <div className="levees-title">
                    <strong>PLANNING DES LEVÉES</strong>
                </div>

                <div className="levees-date">
                    <strong>
                        {estSemaineActuelle
                            ? "Semaine en cours"
                            : offsetSemaine === -1
                            ? "Semaine précédente"
                            : offsetSemaine === 1
                            ? "Semaine prochaine"
                            : `Semaine ${offsetSemaine > 0 ? "+" : ""}${offsetSemaine}`}
                    </strong>
                    <small>{formatPlage(semaine.lundi, semaine.dimanche)}</small>
                </div>
            </header>

            {/* ERREUR */}
            {error && <div className="levees-error">{error}</div>}

            {/* TOOLBAR */}
            <div className="levees-toolbar">

                <div className="levees-search">
                    <span>⌕</span>
                    <input
                        type="text"
                        placeholder="Rechercher par code, défunt ou chapelle..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="levees-filter">
                    <label>CHAPELLE</label>
                    <select
                        value={chapelleFilter}
                        onChange={(e) => setChapelleFilter(e.target.value)}
                    >
                        <option value="TOUTES">TOUTES</option>

                        {chapelles.map((chapelle) => (
                            <option key={chapelle} value={chapelle}>
                                {chapelle}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="levees-week-nav">
                    <button
                        type="button"
                        className="week-btn"
                        onClick={semainePrecedente}
                        title="Semaine précédente"
                    >
                        ‹
                    </button>

                    <button
                        type="button"
                        className={`week-btn-today ${
                            estSemaineActuelle ? "active" : ""
                        }`}
                        onClick={semaineActuelle}
                    >
                        Cette semaine
                    </button>

                    <button
                        type="button"
                        className="week-btn"
                        onClick={semaineSuivante}
                        title="Semaine suivante"
                    >
                        ›
                    </button>
                </div>

                <button
                    className="levees-refresh"
                    onClick={actualiser}
                    title="Actualiser"
                >
                    ↻
                </button>
            </div>

            {/* BOARD */}
            <div className="levees-board">

                <div className="departure-banner">
                    <div>
                        <strong>LEVÉES DE LA SEMAINE</strong>
                    </div>

                    <div className="departure-number">
                        <small>LEVÉES</small>
                        <strong>{leveesFiltrees.length}</strong>
                    </div>
                </div>

                <div className="levees-columns">
                    <div>DATE</div>
                    <div>HEURE</div>
                    <div>CHAPELLE</div>
                    <div>CODE</div>
                    <div>DÉFUNT</div>
                    <div>STATUT</div>
                </div>

                {loading ? (
                    <div className="levees-empty">
                        <div className="loading-icon">↻</div>
                        CHARGEMENT DU PLANNING...
                    </div>
                ) : leveesFiltrees.length === 0 ? (
                    <div className="levees-empty">
                        <div className="empty-icon">—</div>
                        {estSemaineActuelle
                            ? "AUCUNE LEVÉE PROGRAMMÉE CETTE SEMAINE"
                            : "AUCUNE LEVÉE POUR CETTE SEMAINE"}
                    </div>
                ) : (
                    leveesFiltrees.map((levee) => {
                        const statut = getStatutLevee(levee);

                        return (
                            <div
                                className={`levee-row ${
                                    statut === "TERMINÉ" ? "levee-terminee" : ""
                                }`}
                                key={levee.id}
                            >
                                <div className="levee-date-cell">
                                    <strong>
                                        {afficherDate(getDateLevee(levee))}
                                    </strong>
                                </div>

                                <div className="levee-time-cell">
                                    <strong>
                                        {afficherHeure(getHeureLevee(levee))}
                                    </strong>
                                </div>

                                <div className="levee-chapelle-cell">
                                    <span>{getChapelle(levee)}</span>
                                </div>

                                <div>
                                    <span className="levee-code">
                                        {getCode(levee)}
                                    </span>
                                </div>

                                <div className="levee-defunt">
                                    <strong>{getNomDefunt(levee)}</strong>
                                </div>

                                <div>
                                    <span
                                        className={`levee-status ${getStatutClass(
                                            statut
                                        )}`}
                                    >
                                        <span className="status-dot"></span>
                                        {statut}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}

                <div className="levees-footer">
                    <span>
                        {leveesFiltrees.length} LEVÉE(S) AFFICHÉE(S)
                    </span>

                    <span>
                        PÉRIODE : {formatPlage(semaine.lundi, semaine.dimanche)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default PlanningLevees;