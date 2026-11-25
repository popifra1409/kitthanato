import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../services/http";
import api, { asList } from "../services/api";
import "./GenreDeMort.css";

/* =========================================================
   FACTEUR D'ÉCHELLE (utilisé uniquement par l'EN-TÊTE, inchangé)
========================================================= */
const K = 1.074;

/* =========================================================
   DATE DU JOUR
========================================================= */
const dateDuJour = () =>
    new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date());

/* =========================================================
   FORMAT DATE LARAVEL
========================================================= */
const formaterDate = (date) => {
    if (!date) return "";
    const valeur = String(date).split("T")[0].split(" ")[0];
    const correspondance = valeur.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (correspondance) {
        return `${correspondance[3]}/${correspondance[2]}/${correspondance[1]}`;
    }
    return valeur;
};

const heureHm = (v) => (v ? String(v).substring(0, 5) : "");

/* =========================================================
   CONSTANTES
   x = position gauche du libellé (mm), y = centre de la ligne (mm)
========================================================= */
const GENRES_GAUCHE = [
    { key: "naturelle", label: "Mort naturelle (maladie)", x: 68.5, y: 161.3 },
    { key: "accident", label: "Accident", x: 68.5, y: 168 },
    { key: "armeFeu", label: "Arme à feu", x: 68.5, y: 176.6 },
    { key: "empoisonnement", label: "Empoisonnement", x: 68.5, y: 185.4 },
    { key: "indeterminee", label: "Mort de cause indéterminée", x: 68.5, y: 192 },
];

const GENRES_DROITE = [
    { key: "violente", label: "Mort violente (cause externe)", x: 129, y: 160.5 },
    { key: "armeBlanche", label: "Arme blanche", x: 129, y: 168.4 },
    { key: "noyade", label: "Noyade", x: 129, y: 176.6 },
];

const OUI_NON = [
    { key: "oui", label: "OUI" },
    { key: "non", label: "NON" },
    { key: "inconnu", label: "Inconnu" },
];

const DONNEES_VIDES = {
    ref: "",
    yaounde: "",
    soussigne: "",
    constat: "",
    leOn: "",
    atteste: "",
    sexe: "",
    nele: "",
    decedeLe: "",
    a: "",
    lieu: "",
    heures: "",
    minutes: "",
    autres: "",
    autresPrecision: "",
    contagion: "",
    autopsie: "",
    faitA: "",
    faitLe: "",
    faitHeure: "",
};

const statutDepot = (depot) => {
    if (!depot) return { label: "—", classe: "depot-statut--neutre" };
    if (depot.scelle)
        return { label: "Scellé", classe: "depot-statut--scelle" };

    const statut = String(depot.statut || "").toUpperCase();
    if (statut === "SORTI")
        return { label: "Sorti", classe: "depot-statut--sorti" };
    if (statut === "TRANSFÉRÉ" || statut === "TRANSFERE")
        return { label: "Transféré", classe: "depot-statut--transfere" };
    if (statut === "PRÉSENT" || statut === "PRESENT")
        return { label: "Présent", classe: "depot-statut--present" };
    return { label: depot.statut || "—", classe: "depot-statut--neutre" };
};

/* =========================================================
   EN-TÊTES IMPRIMÉS (inchangés)
========================================================= */
const LEFT_HEAD = [
    ["REPUBLIQUE DU CAMEROUN", 3.6, 0],
    ["Paix-Travail-Patrie", 6.8, 0],
    ["-----------", 9.6, 0],
    ["MINISTERE DE LA SANTE PUBLIQUE", 12.3, 0],
    ["-----------", 15.9, 0],
    ["HOPITAL GENERAL DE YAOUNDE", 19.5, 0],
    ["-----------", 23.3, 0],
    ["B.P. 5408", 27, 0],
    ["Tél : (237) 222.21.31.81", 30.7, 0],
    ["Fax : (237) 222.21.30.15", 34.3, 0],
    ["hopitalgeneraldeyaounde@gmail.com", 37.9, 0],
];

const RIGHT_HEAD = [
    ["REPUBLIC OF CAMEROON", 3.6, 0],
    ["Peace-Work-Fatherland", 6.8, 0],
    ["-----------", 9.6, 0],
    ["MINISTRY OF PUBLIC HEALTH", 12.3, 0],
    ["-----------", 15.9, 0],
    ["YAOUNDE GENERAL HOSPITAL", 19.5, 0],
    ["-----------", 23.3, 0],
];

/* =========================================================
   COMPOSANT
========================================================= */
function GenreDeMort() {
    const { depotId } = useParams();
    const navigate = useNavigate();

    const [depots, setDepots] = useState([]);
    const [chargementDepots, setChargementDepots] = useState(false);

    const [selecteurOuvert, setSelecteurOuvert] = useState(false);
    const [recherche, setRecherche] = useState("");
    const [chargementSelection, setChargementSelection] = useState(false);

    const [chargement, setChargement] = useState(false);
    const [message, setMessage] = useState({
        open: false,
        type: "success",
        text: "",
    });
    const [certificatId, setCertificatId] = useState(null);
    const [enregistrement, setEnregistrement] = useState(false);

    const [data, setData] = useState({
        ...DONNEES_VIDES,
        yaounde: dateDuJour(),
    });
    const [genres, setGenres] = useState({});
    const [defuntActif, setDefuntActif] = useState(null);

    /* Auto-dismiss */
    useEffect(() => {
        if (!message.open) return;
        const timer = setTimeout(() => {
            setMessage((m) => ({ ...m, open: false }));
        }, 2500);
        return () => clearTimeout(timer);
    }, [message.open, message.text]);

    const afficherMessage = (type, text) => {
        setMessage({ open: true, type, text });
    };

    const set = (k, v) => setData((s) => ({ ...s, [k]: v }));

    /* =====================================================
       CHARGEMENT DES DÉPÔTS
    ===================================================== */
    const chargerDepots = async () => {
        try {
            setChargementDepots(true);
            const resultat = await api.depots.list();
            setDepots(asList(resultat, "depots"));
        } catch (error) {
            console.error(error);
            setDepots([]);
            afficherMessage(
                "error",
                "Impossible de charger la liste des défunts."
            );
        } finally {
            setChargementDepots(false);
        }
    };

    useEffect(() => {
        chargerDepots();
    }, []);

    /* =====================================================
       FILTRE
    ===================================================== */
    const depotsFiltres = useMemo(() => {
        const t = recherche.trim().toLowerCase();

        const base = !t
            ? depots
            : depots.filter((depot) => {
                  const texte = [
                      depot.code,
                      depot.code_defunt,
                      depot.nom,
                      depot.prenom,
                      depot.contact_nom,
                  ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase();
                  return texte.includes(t);
              });

        return [...base].sort((a, b) =>
            `${a.nom || ""} ${a.prenom || ""}`.localeCompare(
                `${b.nom || ""} ${b.prenom || ""}`,
                "fr"
            )
        );
    }, [depots, recherche]);

    /* =====================================================
       LIBELLÉ
    ===================================================== */
    const libelleDepot = (depot) =>
        [depot.code || depot.code_defunt, depot.nom, depot.prenom]
            .filter(Boolean)
            .join(" - ");

    /* =====================================================
       CHARGEMENT DU CERTIFICAT
    ===================================================== */
    const chargerCertificat = async (idDepot, libelleDefunt) => {
        if (!idDepot) return;

        try {
            setChargement(true);

            const resultat = await get(
                `/certificats-genre-mort/depot/${idDepot}`
            );

            const depot = resultat?.depot || {};
            const certificat = resultat?.certificat || null;

            const donneesDefunt = {
                sexe:
                    depot.sexe === "Masculin"
                        ? "M"
                        : depot.sexe === "Féminin"
                        ? "F"
                        : depot.sexe === "M" || depot.sexe === "F"
                        ? depot.sexe
                        : "",
                nele: formaterDate(depot.date_naissance),
                decedeLe: formaterDate(depot.date_deces),
                heures: depot.heure_deces
                    ? String(depot.heure_deces).split(":")[0]
                    : "",
                minutes: depot.heure_deces
                    ? String(depot.heure_deces).split(":")[1] || ""
                    : "",
                atteste: [depot.nom, depot.prenom]
                    .filter(Boolean)
                    .join(" "),
            };

            if (certificat) {
                setCertificatId(certificat.id);
                setData({
                    ...DONNEES_VIDES,
                    ...donneesDefunt,
                    ...(certificat.donnees || {}),
                    yaounde: dateDuJour(),
                });
                setGenres(certificat.genres || {});
            } else {
                setCertificatId(null);
                setData({
                    ...DONNEES_VIDES,
                    ...donneesDefunt,
                    yaounde: dateDuJour(),
                });
                setGenres({});
            }

            setDefuntActif({
                id: String(idDepot),
                libelle: libelleDefunt || depot.code || `Dépôt #${idDepot}`,
            });
        } catch (error) {
            console.error(error);
            afficherMessage(
                "error",
                error.message || "Impossible de charger le certificat."
            );
        } finally {
            setChargement(false);
        }
    };

    /* =====================================================
       SÉLECTION
    ===================================================== */
    const choisirDefunt = async (depot) => {
        setChargementSelection(true);
        try {
            setSelecteurOuvert(false);
            setRecherche("");

            if (String(depot.id) !== String(depotId || "")) {
                navigate(`/certificatgenremort/${depot.id}`, {
                    replace: false,
                });
            }

            await chargerCertificat(depot.id, libelleDepot(depot));
        } finally {
            setChargementSelection(false);
        }
    };

    /* =====================================================
       CHARGEMENT INITIAL
    ===================================================== */
    useEffect(() => {
        if (!depotId) {
            setData({ ...DONNEES_VIDES, yaounde: dateDuJour() });
            setGenres({});
            setCertificatId(null);
            setDefuntActif(null);
            return;
        }

        chargerCertificat(depotId);

        const depot = depots.find((d) => String(d.id) === String(depotId));
        if (depot) {
            setDefuntActif({
                id: String(depot.id),
                libelle: libelleDepot(depot),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [depotId, depots]);

    /* =====================================================
       GENRES
    ===================================================== */
    const toggleGenre = (key) => {
        setGenres((anciensGenres) => ({
            ...anciensGenres,
            [key]: !anciensGenres[key],
        }));
    };

    /* =====================================================
       ✅ ENREGISTRER — retourne true si succès, false sinon
    ===================================================== */
    const enregistrerCertificat = async (e) => {
        if (e) e.preventDefault();

        if (!defuntActif?.id) {
            afficherMessage("error", "Veuillez sélectionner un défunt.");
            return false;
        }

        try {
            setEnregistrement(true);

            const payload = {
                depot_id: Number(defuntActif.id),
                donnees: { ...data, yaounde: dateDuJour() },
                genres,
            };

            if (certificatId) {
                await put(
                    `/certificats-genre-mort/${certificatId}`,
                    payload
                );
                afficherMessage(
                    "success",
                    "Certificat modifié avec succès."
                );
            } else {
                const resultat = await post(
                    "/certificats-genre-mort",
                    payload
                );
                const nouvelId =
                    resultat?.certificat?.id ??
                    resultat?.data?.certificat?.id ??
                    resultat?.data?.id ??
                    resultat?.id;

                if (nouvelId) setCertificatId(nouvelId);

                afficherMessage(
                    "success",
                    "Certificat enregistré avec succès."
                );
            }
            return true;
        } catch (error) {
            console.error(error);
            afficherMessage(
                "error",
                error.message || "Impossible d'enregistrer le certificat."
            );
            return false;
        } finally {
            setEnregistrement(false);
        }
    };

    /* =====================================================
       RETOUR / IMPRIMER
    ===================================================== */
    const retour = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

    /* =====================================================
       ✅ IMPRIMER — enregistre d'abord, imprime ensuite
    ===================================================== */
    const imprimer = async () => {
        const ok = await enregistrerCertificat();
        if (!ok) return;

        window.requestAnimationFrame(() => {
            window.print();
        });
    };

    /* =====================================================
       COMPOSANTS D'IMPRESSION
    ===================================================== */
    const T = (text, x, y, cls = "") => (
        <span
            className={`t ${cls}`}
            style={{ left: `${x}mm`, top: `${y - 3}mm` }}
        >
            {text}
        </span>
    );

    const I = (k, x, w, y, cls = "") => (
        <input
            className={`f-input ${cls}`}
            style={{
                left: `${x}mm`,
                width: `${w}mm`,
                top: `${y - 2.7}mm`,
            }}
            value={data[k] ?? ""}
            onChange={(e) => set(k, e.target.value)}
            aria-label={k}
        />
    );

    const LB = (label, checked, onClick, x, y, cls = "") => (
        <span
            className={`lb ${cls}`}
            style={{ left: `${x}mm`, top: `${y - 3}mm` }}
        >
            <span>{label}</span>
            <button
                type="button"
                className="f-box"
                role="checkbox"
                aria-checked={checked}
                onClick={onClick}
            >
                {checked ? "✕" : ""}
            </button>
        </span>
    );

    const B = (k, v, label, x, y, cls = "") =>
        LB(
            label,
            data[k] === v,
            () => set(k, data[k] === v ? "" : v),
            x,
            y,
            cls
        );

    const G = (g) =>
        LB(g.label, !!genres[g.key], () => toggleGenre(g.key), g.x, g.y, "sm");

    const head = (lines, left) => (
        <div className="head-col" style={{ left: `${left}mm` }}>
            {lines.map(([txt, y, bold], i) => (
                <p
                    key={i}
                    className={bold ? "b" : ""}
                    style={{ top: `${y * K - 1.8}mm` }}
                >
                    {txt}
                </p>
            ))}
        </div>
    );

    /* =====================================================
       RENDU
    ===================================================== */
    return (
        <div className="sheet-wrap">
            {/* MESSAGE */}
            {message.open && (
                <div
                    className={`depot-message message-${message.type} no-print`}
                    role="alert"
                >
                    <span className="message-icon">
                        {message.type === "success" ? "✓" : "!"}
                    </span>
                    <span>{message.text}</span>
                </div>
            )}

            {/* BARRE DE RECHERCHE */}
            <div className="top-search no-print">
                <button
                    type="button"
                    className="top-search-trigger"
                    onClick={() => {
                        setRecherche("");
                        setSelecteurOuvert(true);
                    }}
                >
                    🔍 Choisir le défunt
                </button>

                {defuntActif && (
                    <div className="top-search-current">
                        <span>Sélectionné :</span>
                        <strong>{defuntActif.libelle}</strong>
                    </div>
                )}
            </div>

            {/* CHARGEMENT */}
            {chargement && (
                <p className="gm-loading no-print">
                    Chargement du certificat…
                </p>
            )}

            {/* FEUILLE A4 */}
            <main className="sheet">
                {head(LEFT_HEAD, 11)}
                <img
                    className="gm-header__emblem"
                    src="/logo.png"
                    alt="Logo de l'hôpital"
                />
                {head(RIGHT_HEAD, 153)}

                {T("N/Ref :", 25.6, 52.6)}
                {I("ref", 40, 32, 52.6)}
                {T("/HGY/DMR/CD", 73, 52.6)}

                {T("Yaoundé le", 139.3, 55)}
                {I("yaounde", 160.5, 26, 55)}
                {T("Yaounde the", 139.5, 59.4, "en")}

                <h1 className="title" style={{ top: `${70.7 - 3.5}mm` }}>
                    CERTIFICAT DE GENRE DE MORT
                </h1>

                {T("Je soussigné", 25.6, 84.9)}
                {I("soussigne", 57, 134, 84.9)}
                {T("I, the Undersigned", 27, 89.3, "en")}

                {T("Sur la base du Constat de décès établi par", 25.6, 98.7)}
                {I("constat", 109.5, 83, 98.7)}
                {T("Based on the death confirmed by", 32, 103.1, "en")}

                {T("Le/on", 91.5, 107.2)}
                {I("leOn", 102, 90, 107.2)}

                {T("Atteste que :", 25.6, 111.8)}
                {I("atteste", 49, 144, 112.3)}
                {T("Affirms that", 25.6, 116, "en")}

                {T("Sexe/Sex :", 25.6, 125.5, "bold")}
                {B("sexe", "M", "Masculin", 52.9, 125.5)}
                {B("sexe", "F", "Féminin", 115.6, 125.5)}

                {T("Né(e) le :", 25.6, 133)}
                {I("nele", 45, 27, 132)}
                {T("Born on", 25.6, 138.6, "en")}

                {T("est décédé le", 74.5, 133)}
                {I("decedeLe", 100.5, 30, 133)}
                {T("died on", 85, 138.6, "en")}

                {T("A", 132, 134.2)}
                {I("heures", 136, 10, 133)}
                {T("heure(s)", 146.8, 133)}
                {I("minutes", 164, 10, 133)}
                {T("minute(s)", 173, 133)}

                {T("Lieu du décès :", 25.6, 145.4)}
                {I("lieu", 54, 140, 145.4)}
                {T("Place of death", 25.6, 149.6, "en")}

                {T("Genre de mort :", 25.6, 158.2)}
                {T("Cause of death", 25.6, 162.2, "en")}

                {GENRES_GAUCHE.map((g) => (
                    <React.Fragment key={g.key}>{G(g)}</React.Fragment>
                ))}

                {GENRES_DROITE.map((g) => (
                    <React.Fragment key={g.key}>{G(g)}</React.Fragment>
                ))}

                {T("Autres :", 129, 185.2, "sm")}
                {I("autres", 141.5, 38, 185.2)}
                {I("autresPrecision", 130, 39, 192.3)}
                {T("(à préciser)", 170.5, 191, "sm")}

                {T(
                    "La dépouille présente-t-elle un risque de contagiosité particulier ?",
                    25.6,
                    200.8,
                    "q"
                )}
                {T(
                    "Is the corpse presenting any risk of contamination ?",
                    25.6,
                    206.8,
                    "en"
                )}
                {B("contagion", "oui", "OUI", 24.5, 216, "lg")}
                {B("contagion", "non", "NON", 80.9, 216, "lg")}
                {B("contagion", "inconnu", "Inconnu", 129.5, 216, "sm")}

                {T("Une autopsie a-t-elle été réalisée ?", 25.6, 226.6, "q")}
                {T("Was an autopsy performed ?", 25.6, 232.5, "en")}
                {B("autopsie", "oui", "OUI", 24.5, 242, "lg")}
                {B("autopsie", "non", "NON", 80.9, 242, "lg")}
                {B("autopsie", "inconnu", "Inconnu", 129.5, 242, "sm")}

                {T("Fait à", 67.3, 254.5, "bold")}
                {I("faitA", 80.5, 33, 254)}
                {T("Le", 115.5, 254.5, "bold")}
                {I("faitLe", 122.5, 25, 254)}
                {T("Heure", 149.3, 254.5, "bold")}
                {I("faitHeure", 162.5, 24, 254)}

                <strong className="sign" style={{ top: `${261 - 3}mm` }}>
                    Signature et Cachet du Praticien
                </strong>
            </main>

            {/* BOUTONS */}
            <div className="bottom-actions no-print">
                <button
                    type="button"
                    className="btn-primary"
                    onClick={enregistrerCertificat}
                    disabled={enregistrement || !defuntActif}
                >
                    💾{" "}
                    {enregistrement
                        ? "Enregistrement…"
                        : certificatId
                        ? "Enregistrer les modifications"
                        : "Enregistrer"}
                </button>

                <button
                    type="button"
                    className="btn-secondary"
                    onClick={imprimer}
                    disabled={!defuntActif || enregistrement}
                >
                    🖨 Imprimer / PDF
                </button>

                <button
                    type="button"
                    className="btn-retour"
                    onClick={retour}
                >
                    ← Retour
                </button>
            </div>

            {/* SÉLECTEUR */}
            {selecteurOuvert && (
                <div
                    className="selecteur-overlay no-print"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget)
                            setSelecteurOuvert(false);
                    }}
                >
                    <div className="selecteur-modal">
                        <div className="selecteur-header">
                            <div>
                                <h2>Choisir le défunt</h2>
                                <p>
                                    Tous les défunts enregistrés. Cliquez
                                    sur un nom pour ouvrir son certificat.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="selecteur-close"
                                onClick={() => setSelecteurOuvert(false)}
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>

                        <div className="selecteur-recherche">
                            <input
                                type="text"
                                placeholder="Rechercher par nom, prénom ou code défunt..."
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                autoFocus
                            />
                            {recherche && (
                                <button
                                    type="button"
                                    onClick={() => setRecherche("")}
                                    aria-label="Effacer"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="selecteur-liste">
                            {chargementDepots ? (
                                <p className="selecteur-vide">
                                    Chargement des défunts…
                                </p>
                            ) : depotsFiltres.length === 0 ? (
                                <p className="selecteur-vide">
                                    Aucun défunt ne correspond.
                                </p>
                            ) : (
                                depotsFiltres.map((depot) => {
                                    const statut = statutDepot(depot);
                                    return (
                                        <button
                                            key={depot.id}
                                            type="button"
                                            className="selecteur-item"
                                            onClick={() => choisirDefunt(depot)}
                                            disabled={chargementSelection}
                                        >
                                            <div className="selecteur-item-left">
                                                <strong>
                                                    {depot.nom || ""}{" "}
                                                    {depot.prenom || ""}
                                                </strong>
                                                <span>
                                                    Code défunt :{" "}
                                                    <b>
                                                        {depot.code_defunt ||
                                                            "-"}
                                                    </b>
                                                </span>
                                                <span>
                                                    Décès :{" "}
                                                    {formaterDate(
                                                        depot.date_deces
                                                    ) || "-"}
                                                    {depot.heure_deces
                                                        ? ` à ${heureHm(
                                                              depot.heure_deces
                                                          )}`
                                                        : ""}
                                                </span>
                                            </div>
                                            <div className="selecteur-item-right">
                                                <span
                                                    className={`depot-statut ${statut.classe}`}
                                                >
                                                    {statut.label}
                                                </span>
                                                <span>
                                                    {depot.provenance || "-"}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="selecteur-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setSelecteurOuvert(false)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GenreDeMort;