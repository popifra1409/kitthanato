import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../services/api";
import "./GlobalSearch.css";

const LONGUEUR_MINIMUM = 2;
const DELAI_SAISIE = 250;

const formateurMontant = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
});

const nomComplet = (dossier) =>
    [dossier?.nom, dossier?.prenom].filter(Boolean).join(" ") ||
    "Dossier sans nom";

const dateCourte = (date) => {
    if (!date) return "";
    const [annee, mois, jour] = String(date).substring(0, 10).split("-");
    return jour && mois && annee ? `${jour}/${mois}/${annee}` : String(date);
};

const montant = (valeur) =>
    `${formateurMontant.format(Number(valeur) || 0)} FCFA`;

const construireResultats = (reponse) => {
    const elements = [];

    (reponse?.corps || []).forEach((corps) => {
        const sousTitre = [
            corps.date_arrivee && `Arrivé le ${dateCourte(corps.date_arrivee)}`,
            corps.caisson && `Caisson ${corps.caisson}`,
            corps.chambre,
            corps.scelle && "Scellé",
            corps.statut,
        ]
            .filter(Boolean)
            .join(" · ");

        elements.push({
            cle: `corps-${corps.id}`,
            groupe: "Corps déposés",
            icone: "⚰️",
            titre: `${nomComplet(corps)} — ${corps.code_defunt || corps.code || "sans code"}`,
            sousTitre,
            lien: `/DepotCorps?depot=${corps.id}`,
        });
    });

    (reponse?.sorties || []).forEach((sortie) => {
        const sousTitre = [
            `Sortie du ${dateCourte(sortie.date)}${sortie.heure ? ` à ${sortie.heure}` : ""}`,
            sortie.recuperateur && `Récupérateur : ${sortie.recuperateur}`,
            sortie.reste_a_payer > 0
                ? `Reste ${montant(sortie.reste_a_payer)}`
                : `Payé ${montant(sortie.montant_total)}`,
        ]
            .filter(Boolean)
            .join(" · ");

        elements.push({
            cle: `sortie-${sortie.id}`,
            groupe: "Sorties",
            icone: "🚪",
            titre: `${nomComplet(sortie)} — sortie du ${dateCourte(sortie.date)}`,
            sousTitre,
            lien: `/DepotCorps?depot=${sortie.depot_id}`,
        });
    });

    (reponse?.declarations || []).forEach((declaration) => {
        const sousTitre = [
            `Décès le ${dateCourte(declaration.date_deces)}`,
            declaration.declarant_nom &&
                `Déclarant : ${declaration.declarant_nom}`,
        ]
            .filter(Boolean)
            .join(" · ");

        elements.push({
            cle: `declaration-${declaration.id}`,
            groupe: "Déclarations de décès",
            icone: "📄",
            titre: `${nomComplet(declaration)} — ${declaration.numero_declaration || "déclaration"}`,
            sousTitre,
            lien: `/declarations?q=${encodeURIComponent(
                declaration.numero_declaration || nomComplet(declaration)
            )}`,
        });
    });

    return elements;
};

function GlobalSearch({ variante = "desktop", onNaviguer }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [texte, setTexte] = useState("");
    const [resultats, setResultats] = useState([]);
    const [chargement, setChargement] = useState(false);
    const [erreur, setErreur] = useState("");
    const [ouvert, setOuvert] = useState(false);
    const [cleOuverture, setCleOuverture] = useState(null);
    const [indexActif, setIndexActif] = useState(-1);

    const conteneur = useRef(null);
    const champ = useRef(null);
    const minuterie = useRef(null);
    const controleur = useRef(null);
    const liste = useRef(null);

    /* Le panneau se referme tout seul dès que la route change. */
    const panneauVisible = ouvert && cleOuverture === location.key;

    const idPanneau = `recherche-panneau-${variante}`;

    useEffect(() => {
        const surClicExterieur = (evenement) => {
            if (!conteneur.current?.contains(evenement.target)) {
                setOuvert(false);
            }
        };

        document.addEventListener("mousedown", surClicExterieur);

        return () => document.removeEventListener("mousedown", surClicExterieur);
    }, []);

    useEffect(() => {
        const raccourci = (evenement) => {
            if (
                (evenement.ctrlKey || evenement.metaKey) &&
                evenement.key.toLowerCase() === "k"
            ) {
                evenement.preventDefault();
                champ.current?.focus();
            }
        };

        document.addEventListener("keydown", raccourci);

        return () => document.removeEventListener("keydown", raccourci);
    }, []);

    useEffect(
        () => () => {
            clearTimeout(minuterie.current);
            controleur.current?.abort();
        },
        []
    );

    const rechercher = (valeur) => {
        clearTimeout(minuterie.current);
        controleur.current?.abort();

        const requete = valeur.trim();

        if (requete.length < LONGUEUR_MINIMUM) {
            setResultats([]);
            setChargement(false);
            setErreur("");
            return;
        }

        setChargement(true);
        setErreur("");

        const controleurLocal = new AbortController();
        controleur.current = controleurLocal;

        minuterie.current = setTimeout(() => {
            api.recherche
                .globale(requete, { signal: controleurLocal.signal })
                .then((reponse) => {
                    setResultats(construireResultats(reponse));
                })
                .catch((error) => {
                    if (controleurLocal.signal.aborted) return;

                    setResultats([]);
                    setErreur(
                        error?.firstMessage || "Recherche impossible."
                    );
                })
                .finally(() => {
                    if (!controleurLocal.signal.aborted) {
                        setChargement(false);
                    }
                });
        }, DELAI_SAISIE);
    };

    const ouvrirPanneau = () => {
        setOuvert(true);
        setCleOuverture(location.key);
    };

    const changerTexte = (valeur) => {
        setTexte(valeur);
        setIndexActif(-1);
        ouvrirPanneau();
        rechercher(valeur);
    };

    const effacer = () => {
        clearTimeout(minuterie.current);
        controleur.current?.abort();

        setTexte("");
        setResultats([]);
        setErreur("");
        setChargement(false);
        setIndexActif(-1);
        champ.current?.focus();
    };

    const fermer = () => {
        setOuvert(false);
        setIndexActif(-1);
        champ.current?.blur();
    };

    const ouvrirResultat = (element) => {
        if (!element) return;

        navigate(element.lien);
        setTexte("");
        setResultats([]);
        setErreur("");
        setOuvert(false);
        setIndexActif(-1);
        champ.current?.blur();

        onNaviguer?.();
    };

    const surTouche = (evenement) => {
        if (evenement.key === "Escape") {
            evenement.preventDefault();
            fermer();
            return;
        }

        if (evenement.key === "ArrowDown" || evenement.key === "ArrowUp") {
            if (resultats.length === 0) return;

            evenement.preventDefault();

            const sens = evenement.key === "ArrowDown" ? 1 : -1;
            const suivant =
                (indexActif + sens + resultats.length) % resultats.length;

            setIndexActif(suivant);

            liste.current
                ?.querySelector(`[data-index="${suivant}"]`)
                ?.scrollIntoView({ block: "nearest" });

            return;
        }

        if (evenement.key === "Enter" && resultats.length > 0) {
            evenement.preventDefault();
            ouvrirResultat(resultats[Math.max(indexActif, 0)]);
        }
    };

    const requeteTropCourte = texte.trim().length < LONGUEUR_MINIMUM;

    return (
        <div
            className={`recherche-globale ${
                variante === "mobile" ? "recherche-globale--mobile" : ""
            }`}
            ref={conteneur}
        >
            <div className={`recherche-champ ${panneauVisible ? "ouvert" : ""}`}>
                <span className="recherche-icone" aria-hidden="true">
                    🔍
                </span>

                <input
                    ref={champ}
                    className="recherche-input"
                    type="text"
                    value={texte}
                    placeholder="Rechercher un défunt, un code…"
                    autoComplete="off"
                    spellCheck="false"
                    role="combobox"
                    aria-expanded={panneauVisible}
                    aria-controls={idPanneau}
                    aria-autocomplete="list"
                    aria-label="Recherche globale"
                    onChange={(evenement) => changerTexte(evenement.target.value)}
                    onFocus={ouvrirPanneau}
                    onKeyDown={surTouche}
                />

                {texte && (
                    <button
                        type="button"
                        className="recherche-effacer"
                        onClick={effacer}
                        aria-label="Effacer la recherche"
                    >
                        ✕
                    </button>
                )}

                <kbd className="recherche-raccourci" aria-hidden="true">
                    Ctrl K
                </kbd>
            </div>

            {panneauVisible && (
                <div
                    className="recherche-panneau"
                    id={idPanneau}
                    role="listbox"
                    aria-label="Résultats de la recherche"
                    ref={liste}
                >
                    {requeteTropCourte && (
                        <p className="recherche-info">
                            Tapez au moins {LONGUEUR_MINIMUM} caractères pour
                            chercher un corps, une sortie ou une déclaration.
                        </p>
                    )}

                    {!requeteTropCourte && chargement && (
                        <p className="recherche-info">Recherche en cours…</p>
                    )}

                    {!requeteTropCourte && !chargement && erreur && (
                        <p className="recherche-erreur">{erreur}</p>
                    )}

                    {!requeteTropCourte &&
                        !chargement &&
                        !erreur &&
                        resultats.length === 0 && (
                            <p className="recherche-info">
                                Aucun résultat pour « {texte.trim()} ».
                            </p>
                        )}

                    {!chargement &&
                        resultats.map((element, index) => (
                            <Fragment key={element.cle}>
                                {resultats[index - 1]?.groupe !==
                                    element.groupe && (
                                    <div className="recherche-groupe">
                                        {element.groupe}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    data-index={index}
                                    className={`recherche-resultat ${
                                        indexActif === index ? "actif" : ""
                                    }`}
                                    role="option"
                                    aria-selected={indexActif === index}
                                    onClick={() => ouvrirResultat(element)}
                                    onMouseEnter={() => setIndexActif(index)}
                                >
                                    <span
                                        className="recherche-resultat-icone"
                                        aria-hidden="true"
                                    >
                                        {element.icone}
                                    </span>

                                    <span className="recherche-resultat-texte">
                                        <strong>{element.titre}</strong>
                                        {element.sousTitre && (
                                            <small>{element.sousTitre}</small>
                                        )}
                                    </span>
                                </button>
                            </Fragment>
                        ))}
                </div>
            )}
        </div>
    );
}

export default GlobalSearch;
