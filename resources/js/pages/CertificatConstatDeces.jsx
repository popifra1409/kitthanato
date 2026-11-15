import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./CertificatConstatDeces.css";
import api, { asList } from "../services/api";
import cssConstat from "./CertificatConstatDeces.css?raw";

/* =========================================================
   PAGE A4 (mm)
========================================================= */
const K = 1.074;

/* =========================================================
   LIEU DE DÉCÈS PAR DÉFAUT POUR UN DÉCÈS INTERNE
========================================================= */
const LIEU_INTERNE = "Hôpital Général de Yaoundé";

/* =========================================================
   FORMATS
========================================================= */
const toIso = (v) => {
    if (!v) return "";
    const s = String(v);
    return s.includes("T")
        ? s.split("T")[0]
        : s.includes(" ")
        ? s.split(" ")[0]
        : s;
};

const isoToFr = (iso) => {
    if (!iso) return "";
    const [a, m, j] = String(iso).substring(0, 10).split("-");
    return a && m && j ? `${j}/${m}/${a}` : "";
};

const heureHm = (v) => (v ? String(v).substring(0, 5) : "");

const aujourdHuiIso = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
};

const heureActuelle = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
    ).padStart(2, "0")}`;
};

/* =========================================================
   DÉTERMINATION DU LIEU DE DÉCÈS
========================================================= */
const determinerLieuDeces = (depot) => {
    if (!depot) return "";
    const provenance = String(depot.provenance || "").toLowerCase();
    if (provenance === "interne") return LIEU_INTERNE;
    if (provenance === "externe") return depot.lieu_provenance || "";
    return depot.lieu_provenance || depot.emplacement || "";
};

/* =========================================================
   ÉTAT INITIAL — `ref` vide, saisi par l'utilisateur
========================================================= */
const initialiser = () => ({
    id: null,

    nomComplet: "",
    nom: "",
    prenom: "",
    sexe: "",
    dateNaissance: "",
    age: "",
    lieu: "",

    dateDeces: "",
    heureDeces: "",

    ref: "",
    dateEmission: aujourdHuiIso(),
    praticien: "",
    dateConstat: aujourdHuiIso(),
    heure: "",
    minute: "",
    circ1: "",
    circ2: "",
    circ3: "",
    obstacle: "",

    faitA: "Yaoundé",
    faitLe: aujourdHuiIso(),
    faitHeure: heureActuelle(),

    depot_id: null,
    code_defunt: "",
});

const INITIAL = initialiser();

/* =========================================================
   EN-TÊTES
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
export default function CertificatConstatDeces() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [d, setD] = useState(INITIAL);

    const [depots, setDepots] = useState([]);
    const [chargementDepots, setChargementDepots] = useState(false);

    const [selecteurOuvert, setSelecteurOuvert] = useState(false);
    const [recherche, setRecherche] = useState("");
    const [chargementSelection, setChargementSelection] = useState(false);

    /* Message type « dépôt » */
    const [message, setMessage] = useState({
        open: false,
        type: "success",
        text: "",
    });

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

    const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

    /* =====================================================
       CHARGEMENT DES DÉPÔTS
    ===================================================== */
    const chargerDepots = async () => {
        try {
            setChargementDepots(true);
            const data = await api.depots.list();
            const liste = asList(data, "depots");
            setDepots(liste);
        } catch (e) {
            console.error("[Constat] chargement dépôts :", e);
            afficherMessage(
                "error",
                "Impossible de charger les dépôts."
            );
        } finally {
            setChargementDepots(false);
        }
    };

    useEffect(() => {
        chargerDepots();
    }, []);

    /* =====================================================
       PRÉ-REMPLISSAGE AUTOMATIQUE DEPUIS ?depot=
    ===================================================== */
    useEffect(() => {
        if (depots.length === 0) return;

        const idParam = searchParams.get("depot");
        if (!idParam) return;

        const depot = depots.find((x) => String(x.id) === String(idParam));
        if (depot) {
            remplirDepuisDepot(depot);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [depots]);

    /* =====================================================
       FILTRE
    ===================================================== */
    const depotsFiltres = useMemo(() => {
        const t = recherche.trim().toLowerCase();
        if (!t) return depots;

        return depots.filter((depot) => {
            const texte = [
                depot.code_defunt,
                depot.code,
                depot.nom,
                depot.prenom,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return texte.includes(t);
        });
    }, [depots, recherche]);

    /* =====================================================
       REMPLISSAGE — clic sur un défunt
    ===================================================== */
    const remplirDepuisDepot = (depot) => {
        if (!depot) {
            afficherMessage("error", "Défunt introuvable.");
            return;
        }

        const nom = depot.nom || "";
        const prenom = depot.prenom || "";
        const nomComplet = [nom, prenom].filter(Boolean).join(" ").trim();

        const dateNaissance = toIso(depot.date_naissance);
        const age =
            depot.age !== null && depot.age !== undefined
                ? String(depot.age)
                : "";

        const sexeRaw = String(depot.sexe || "").trim();
        const sexe =
            sexeRaw === "Masculin" || sexeRaw === "M"
                ? "M"
                : sexeRaw === "Féminin" || sexeRaw === "F"
                ? "F"
                : "";

        const dateDeces = toIso(depot.date_deces);
        const heureDeces = heureHm(depot.heure_deces);
        const lieu = determinerLieuDeces(depot);

        /* Reset complet — `ref` reste vide */
        const base = initialiser();

        setD({
            ...base,

            depot_id: depot.id,
            code_defunt: depot.code_defunt || "",

            nomComplet,
            nom,
            prenom,
            sexe,

            dateNaissance,
            age,

            lieu,

            dateDeces,
            heureDeces,

            /* ref : vide, à saisir par l'utilisateur */
            ref: "",

            dateEmission: aujourdHuiIso(),
            dateConstat: aujourdHuiIso(),
            faitLe: aujourdHuiIso(),
            faitHeure: heureActuelle(),
            faitA: "Yaoundé",
        });

        /* Chargement du constat existant s'il y en a un */
        chargerConstatExistant(depot.id);

        setSelecteurOuvert(false);
        setRecherche("");
    };

    /* =====================================================
       CHARGEMENT DU CONSTAT EXISTANT
    ===================================================== */
    const chargerConstatExistant = async (depotId) => {
        try {
            if (!api.constats?.list) return;

            const response = await api.constats.getByDepot(depotId);

const existant = response.constat;

            if (!existant) return;

            const heureConstat = existant.heure_constat
                ? String(existant.heure_constat).substring(0, 5)
                : "";

            setD((s) => ({
                ...s,
                id: existant.id,
                ref: s.ref || "",
                praticien: existant.praticien || "",
                dateConstat:
                    toIso(existant.date_constat) || aujourdHuiIso(),
                heure: heureConstat ? heureConstat.substring(0, 2) : "",
                minute: heureConstat ? heureConstat.substring(3, 5) : "",
                circ1: existant.circonstance_1 || "",
                circ2: existant.circonstance_2 || "",
                circ3: existant.circonstance_3 || "",
                obstacle: existant.obstacle_medico_legal || "",
                faitA: existant.fait_a || "Yaoundé",
                faitLe: toIso(existant.fait_le) || aujourdHuiIso(),
                faitHeure:
                    heureHm(existant.fait_heure) || heureActuelle(),
                dateEmission:
                    toIso(existant.created_at) || aujourdHuiIso(),
            }));
        } catch (e) {
            console.warn("[Constat] vérification constat existant :", e);
        }
    };

    /* =====================================================
       CLIC SUR UN DÉFUNT
    ===================================================== */
    const choisirDefunt = (depot) => {
        setChargementSelection(true);
        try {
            remplirDepuisDepot(depot);
        } finally {
            setChargementSelection(false);
        }
    };

    /* =====================================================
       ENREGISTRER
    ===================================================== */
    const enregistrer = async () => {
        if (!d.depot_id) {
            afficherMessage("error", "Veuillez sélectionner un défunt.");
            return;
        }
        if (!d.praticien.trim()) {
            afficherMessage("error", "Veuillez saisir le nom du praticien.");
            return;
        }
        if (!d.dateDeces) {
            afficherMessage("error", "La date de décès est obligatoire.");
            return;
        }

        const heureConstat =
            d.heure || d.minute
                ? `${(d.heure || "00").padStart(2, "0")}:${(
                      d.minute || "00"
                  ).padStart(2, "0")}`
                : null;

        const payload = {
            depot_id: d.depot_id,

            nom: d.nom,
            prenom: d.prenom || null,
            sexe: d.sexe || null,
            date_naissance: d.dateNaissance || null,
            age: d.age ? Number(d.age) : null,
            lieu_deces: d.lieu || null,

            date_deces: d.dateDeces,
            heure_deces: d.heureDeces || null,

            praticien: d.praticien,
            date_constat: d.dateConstat || null,
            heure_constat: heureConstat,

            circonstance_1: d.circ1 || null,
            circonstance_2: d.circ2 || null,
            circonstance_3: d.circ3 || null,

            obstacle_medico_legal: d.obstacle || null,

            fait_a: d.faitA || "Yaoundé",
            fait_le: d.faitLe || null,
            fait_heure: d.faitHeure || null,
        };

        try {
            if (d.id) {
                await api.constats.update(d.id, payload);
                afficherMessage(
                    "success",
                    `Constat de ${d.nomComplet} modifié.`
                );
            } else {
                const res = await api.constats.create(payload);
                setD((s) => ({ ...s, id: res.constat.id }));
                afficherMessage(
                    "success",
                    `Constat de ${d.nomComplet} enregistré.`
                );
            }
        } catch (e) {
            console.error("[Constat] enregistrement :", e);

            if (e.status === 409 && e.constat) {
                const existant = e.constat;
                setD((s) => ({ ...s, id: existant.id }));
                afficherMessage(
                    "error",
                    `Un constat existe déjà pour ce défunt. Formulaire passé en mode modification.`
                );
                return;
            }

            afficherMessage(
                "error",
                e.firstMessage ||
                    e.message ||
                    "Impossible d'enregistrer le constat."
            );
        }
    };

    /* =====================================================
       RETOUR
    ===================================================== */
    const retour = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/");
        }
    };

 const imprimer = async () => {
    const feuille = document.querySelector(".sheet");

    if (!feuille) {
        afficherMessage("error", "Feuille introuvable.");
        return;
    }

    /* Copie de la feuille avec les valeurs saisies */
    const copie = feuille.cloneNode(true);
    const champs = feuille.querySelectorAll("input");

    copie.querySelectorAll("input").forEach((champ, i) => {
        champ.setAttribute("value", champs[i]?.value ?? "");
        champ.removeAttribute("placeholder");
    });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<base href="${window.location.origin}/" />
<title>Certificat de constat de décès</title>
<style>${cssConstat}</style>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0; padding: 0; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet-wrap {
    background: #fff !important;
    padding: 0 !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
  .sheet {
    margin: 0 !important;
    box-shadow: none !important;
    height: 296mm !important;
    overflow: hidden !important;
  }
  .f-input, .f-input:focus { background: transparent !important; }

  /* Même mise en page qu'à l'écran */
  @media print {
    .sheet > * { margin-top: var(--decalage-y) !important; }
    .sheet > .title, .sheet > .sign { margin-top: 55px !important; }
  }
</style>
</head>
<body>
<div class="sheet-wrap">${copie.outerHTML}</div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.title = "Impression du certificat";
    iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    const nettoyer = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    iframe.contentWindow.onafterprint = nettoyer;
    setTimeout(nettoyer, 60000);

    /* Attendre le logo (3 s maximum) puis l'application des styles */
    const images = Array.from(doc.images).map((img) =>
        img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
              })
    );

    await Promise.race([
        Promise.all(images),
        new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 150));

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
};
    /* =====================================================
       COMPOSANTS D'IMPRESSION
    ===================================================== */
    const T = (text, x, y, cls = "") => (
        <span
            className={`t ${cls}`}
            style={{ left: `${x}mm`, top: `${y * K - 3}mm` }}
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
                top: `${y * K - 2.7}mm`,
            }}
            value={d[k]}
            onChange={(e) => set(k, e.target.value)}
            aria-label={k}
        />
    );

    const IDate = (k, x, w, y) => (
        <input
            className="f-input"
            type="text"
            style={{
                left: `${x}mm`,
                width: `${w}mm`,
                top: `${y * K - 2.7}mm`,
            }}
            value={
                d[k] && /^\d{4}-\d{2}-\d{2}/.test(d[k])
                    ? isoToFr(d[k])
                    : d[k] || ""
            }
            onChange={(e) => set(k, e.target.value)}
            placeholder="JJ/MM/AAAA"
            aria-label={k}
        />
    );

    const IHeure = (k, x, w, y) => (
        <input
            className="f-input"
            type="text"
            style={{
                left: `${x}mm`,
                width: `${w}mm`,
                top: `${y * K - 2.7}mm`,
            }}
            value={d[k] || ""}
            onChange={(e) => set(k, e.target.value)}
            placeholder="HH:MM"
            aria-label={k}
        />
    );

    const B = (k, v, x, y) => (
        <button
            type="button"
            className="f-box"
            style={{ left: `${x}mm`, top: `${y * K - 2.25}mm` }}
            role="checkbox"
            aria-checked={d[k] === v}
            onClick={() => set(k, d[k] === v ? "" : v)}
        >
            {d[k] === v ? "✕" : ""}
        </button>
    );

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

            {/* BOUTON UNIFIÉ */}
            <div className="top-search no-print">
                <button
                    type="button"
                    className="top-search-trigger"
                    onClick={() => {
                        setRecherche("");
                        setSelecteurOuvert(true);
                    }}
                >
                    Choisir le défunt
                </button>

                {d.depot_id && (
                    <div className="top-search-current">
                        <span>Sélectionné :</span>
                        <strong>{d.nomComplet || d.code_defunt}</strong>
                        {d.code_defunt && (
                            <span className="top-search-current-code">
                                ({d.code_defunt})
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* FEUILLE */}
            <main className="sheet">
                {head(LEFT_HEAD, 11)}
                <img
    className="constat-logo"
    src="/logo.png"
    alt="Logo de l'hôpital"
/>
                {head(RIGHT_HEAD, 153)}

                {T("N/Ref :", 25.6, 49)}
                {I("ref", 40, 32, 49)}
                {T("/HGY/DMR/CD", 73, 49)}

                {T("Yaoundé le", 133, 52)}
                {IDate("dateEmission", 155, 42, 52)}
                {T("Yaounde the", 133, 59, "en")}

                <h1 className="title" style={{ top: `${72.5 * K}mm` }}>
                    CERTIFICAT DE CONSTAT DE DECES
                </h1>

                {T("Je soussigné", 25.6, 93.7)}
                {I("praticien", 60, 137, 93.7)}
                {T("I, the Undersigned", 25.6, 97.8, "en")}

                {T("Atteste avoir constaté le décès de", 25.6, 110)}
                {I("nomComplet", 99, 98, 105, "big")}
                {T("Affirm the death of", 25.6, 114.7, "en")}

                {T("Sexe/Sex :", 25.6, 126)}
                {T("Masculin", 51, 126)}
                {B("sexe", "M", 69.5, 126)}
                {T("Féminin", 107, 126)}
                {B("sexe", "F", 128, 126)}

                {T("Né(e) le :", 25.6, 136)}
                {I("dateNaissance", 44, 32, 136)}
                {T("Age :", 78, 136)}
                {I("age", 89, 14, 136)}
                {T("Lieu du décès :", 104, 136)}
                {I("lieu", 134, 64, 136)}
                {T("Born on", 25.6, 141, "en")}
                {T("Died on", 118, 141, "en")}

                {T("Constat effectué le", 25.6, 150.5)}
                {IDate("dateConstat", 62, 44, 150.5)}
                {T("A", 108, 150.5)}
                {I("heure", 113, 24, 150.5)}
                {T("heure(s)", 138, 150.5)}
                {I("minute", 157, 19, 150.5)}
                {T("minute(s)", 177, 150.5)}
                {T("Observation made on", 25.6, 155, "en")}

                {T("Circonstances/Circumstances :", 25.6, 165)}
                {I("circ1", 85, 112, 163)}
                {I("circ2", 25.6, 171.4, 173.5)}

                {T("Observations :", 25.6, 188)}
                {T("Obstacle médico-légal", 25.6, 194.5)}
                {T("Oui", 76, 194.5)}
                {B("obstacle", "oui", 84.5, 194.5)}
                {T("Non", 134, 194.5)}
                {B("obstacle", "non", 148, 194.5)}
                {T("Legal hinderances", 25.6, 198.6, "en")}

                {T("Fait à", 76, 213.5)}
                {I("faitA", 89, 38, 213.5)}
                {T("Le", 129, 213.5)}
                {IDate("faitLe", 136, 26, 213.5)}
                {T("Heure", 164, 213.5)}
                {IHeure("faitHeure", 177, 20, 213.5)}

                <strong className="sign" style={{ top: `${230 * K}mm` }}>
                    Signature et Cachet du Praticien
                </strong>
            </main>

            {/* BOUTONS */}
            <div className="bottom-actions no-print">
                <button
                    type="button"
                    className="btn-primary"
                    onClick={enregistrer}
                >
                    💾 {d.id ? "Enregistrer les modifications" : "Enregistrer"}
                </button>

                <button
                    type="button"
                    className="btn-secondary"
                    onClick={imprimer}
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
                                    Cliquez sur un défunt pour le
                                    sélectionner. Les champs seront
                                    remplis automatiquement.
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
                                onChange={(e) =>
                                    setRecherche(e.target.value)
                                }
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
                                    Chargement des dépôts…
                                </p>
                            ) : depotsFiltres.length === 0 ? (
                                <p className="selecteur-vide">
                                    Aucun dépôt ne correspond.
                                </p>
                            ) : (
                                depotsFiltres.map((depot) => (
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
                                                    {depot.code_defunt || "-"}
                                                </b>
                                            </span>
                                            <span>
                                                Décès :{" "}
                                                {isoToFr(
                                                    toIso(depot.date_deces)
                                                ) || "-"}
                                                {depot.heure_deces
                                                    ? ` à ${heureHm(
                                                          depot.heure_deces
                                                      )}`
                                                    : ""}
                                            </span>
                                        </div>
                                        <div className="selecteur-item-right">
                                            <span>
                                                {depot.provenance || "-"}
                                            </span>
                                            <span>
                                                {depot.provenance === "Interne"
                                                    ? LIEU_INTERNE
                                                    : depot.lieu_provenance ||
                                                      depot.emplacement ||
                                                      ""}
                                            </span>
                                        </div>
                                    </button>
                                ))
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