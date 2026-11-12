import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Emplacements.css";
import api, { asList } from "../services/api";
import { useSession } from "../services/SessionContext";
import NotificationBox from "../components/NotificationBox";
import ConfirmDialog from "../components/ConfirmDialog";

const TYPES = {
    commune: "Commune",
    individuelle: "Individuelle",
};

const FORM_CHAMBRE_VIDE = {
    id: null,
    nom: "",
    type: "commune",
    description: "",
    nombre_caissons: "0",
};

const messageErreur = (error, defaut) =>
    error?.firstMessage || error?.message || defaut;

const formatDateCourte = (valeur) => {
    if (!valeur) return "-";
    const [annee, mois, jour] = String(valeur).split("-");
    if (!annee || !mois || !jour) return valeur;
    return `${jour}/${mois}/${annee}`;
};

const nomComplet = (corps) =>
    [corps?.nom, corps?.prenom].filter(Boolean).join(" ").trim() ||
    corps?.code_defunt ||
    corps?.code ||
    "Corps sans nom";

const libelleSexe = (sexe) => {
    const valeur = String(sexe || "").toUpperCase();
    if (valeur === "M" || valeur === "MASCULIN") return "Masculin";
    if (valeur === "F" || valeur === "FEMININ" || valeur === "FÉMININ") {
        return "Féminin";
    }
    return sexe || "-";
};

/* Caisson de morgue : meuble à trois tiroirs. */
const IconeCaissonFroid = () => (
    <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        <rect x="7" y="4" width="34" height="40" rx="4" />
        <path d="M7 17.3h34M7 30.6h34" />
        <path d="M34 10.6h4M34 23.9h4M34 37.2h4" />
    </svg>
);

function Emplacements() {
    const { can } = useSession();
    const peutGerer = can("emplacements.manage");
    const navigate = useNavigate();

    const [chambres, setChambres] = useState([]);
    const [plan, setPlan] = useState(null);
    const [vue, setVue] = useState("plan");
    const [corpsSelectionne, setCorpsSelectionne] = useState(null);
    const [chargement, setChargement] = useState(true);

    const [notif, setNotif] = useState(null);
    const [confirmation, setConfirmation] = useState(null);

    const [formChambre, setFormChambre] = useState(null);
    const [formCaisson, setFormCaisson] = useState(null);
    const [envoi, setEnvoi] = useState(false);

    const [choixCaisson, setChoixCaisson] = useState(false);
    const [caissonsDisponibles, setCaissonsDisponibles] = useState([]);
    const [caissonChoisi, setCaissonChoisi] = useState("");
    const [chargementCaissons, setChargementCaissons] = useState(false);
    const [actionCorps, setActionCorps] = useState(false);

    /* Glisser-déposer des caissons dans le plan d'occupation */
    const [dragCaissonId, setDragCaissonId] = useState(null);
    const [dropCible, setDropCible] = useState(null);

    const showNotif = (type, title, message = "") =>
        setNotif({ type, title, message });

    const charger = useCallback(async () => {
        try {
            const [dataChambres, dataPlan] = await Promise.all([
                api.emplacements.chambres.list(),
                api.emplacements.plan(),
            ]);
            setChambres(asList(dataChambres));
            setPlan(dataPlan || null);
        } catch (error) {
            setNotif({
                type: "error",
                title: "Chargement impossible",
                message: messageErreur(
                    error,
                    "Impossible de charger les emplacements."
                ),
            });
        } finally {
            setChargement(false);
        }
    }, []);

    useEffect(() => {
        // charger() ne modifie l'état qu'après la réponse HTTP (asynchrone).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        charger();
    }, [charger]);

    /* ---------- CHAMBRES ---------- */

    const ouvrirCreation = () => setFormChambre({ ...FORM_CHAMBRE_VIDE });

    const ouvrirEdition = (chambre) =>
        setFormChambre({
            id: chambre.id,
            nom: chambre.nom,
            type: chambre.type,
            description: chambre.description || "",
            nombre_caissons: "0",
        });

    const fermerFormChambre = () => {
        if (!envoi) setFormChambre(null);
    };

    const enregistrerChambre = async (e) => {
        e.preventDefault();

        try {
            setEnvoi(true);

            const donnees = {
                nom: formChambre.nom.trim(),
                type: formChambre.type,
                description: formChambre.description.trim() || null,
            };

            if (formChambre.id) {
                await api.emplacements.chambres.update(
                    formChambre.id,
                    donnees
                );
            } else {
                await api.emplacements.chambres.create({
                    ...donnees,
                    nombre_caissons: Number(formChambre.nombre_caissons) || 0,
                });
            }

            await charger();
            setFormChambre(null);
            showNotif(
                "success",
                formChambre.id ? "Chambre modifiée" : "Chambre créée",
                `« ${donnees.nom} » a bien été enregistrée.`
            );
        } catch (error) {
            showNotif(
                "error",
                "Échec",
                messageErreur(error, "Impossible d'enregistrer la chambre.")
            );
        } finally {
            setEnvoi(false);
        }
    };

    const demanderBasculeChambre = (chambre) => {
        const desactiver = chambre.actif;

        setConfirmation({
            titre: desactiver
                ? "Désactiver la chambre froide"
                : "Réactiver la chambre froide",
            message: desactiver
                ? `« ${chambre.nom} » et ses caissons ne seront plus proposés pour de nouvelles affectations.`
                : `« ${chambre.nom} » redeviendra disponible.`,
            label: desactiver ? "Désactiver" : "Réactiver",
            type: desactiver ? "warning" : "info",
            action: async () => {
                try {
                    setEnvoi(true);
                    await api.emplacements.chambres.toggleActif(chambre.id);
                    await charger();
                    setConfirmation(null);
                    showNotif(
                        "success",
                        desactiver ? "Chambre désactivée" : "Chambre réactivée",
                        `« ${chambre.nom} » a été mise à jour.`
                    );
                } catch (error) {
                    showNotif(
                        "error",
                        "Échec",
                        messageErreur(error, "Impossible de mettre à jour la chambre.")
                    );
                } finally {
                    setEnvoi(false);
                }
            },
        });
    };

    /* ---------- CAISSONS ---------- */

    const ouvrirAjoutCaisson = (chambre) =>
        setFormCaisson({
            chambreId: chambre.id,
            chambreNom: chambre.nom,
            caissonId: null,
            code: "",
        });

    const ouvrirRenommageCaisson = (chambre, caisson) =>
        setFormCaisson({
            chambreId: chambre.id,
            chambreNom: chambre.nom,
            caissonId: caisson.id,
            code: caisson.code,
        });

    const fermerFormCaisson = () => {
        if (!envoi) setFormCaisson(null);
    };

    const enregistrerCaisson = async (e) => {
        e.preventDefault();

        try {
            setEnvoi(true);

            if (formCaisson.caissonId) {
                await api.emplacements.caissons.update(formCaisson.caissonId, {
                    code: formCaisson.code.trim(),
                });
            } else {
                await api.emplacements.chambres.ajouterCaisson(
                    formCaisson.chambreId,
                    formCaisson.code.trim()
                );
            }

            await charger();
            setFormCaisson(null);
            showNotif(
                "success",
                formCaisson.caissonId ? "Caisson renommé" : "Caisson ajouté",
                `Caisson enregistré dans « ${formCaisson.chambreNom} ».`
            );
        } catch (error) {
            showNotif(
                "error",
                "Échec",
                messageErreur(error, "Impossible d'enregistrer le caisson.")
            );
        } finally {
            setEnvoi(false);
        }
    };

    const basculerCaisson = async (caisson) => {
        try {
            await api.emplacements.caissons.toggleActif(caisson.id);
            await charger();
            showNotif(
                "success",
                caisson.actif ? "Caisson désactivé" : "Caisson réactivé",
                `Le caisson « ${caisson.code} » a été mis à jour.`
            );
        } catch (error) {
            showNotif(
                "error",
                "Échec",
                messageErreur(error, "Impossible de mettre à jour le caisson.")
            );
        }
    };

    /* ---------- ORDRE DES CAISSONS (glisser-déposer) ---------- */

    const deplacerCaisson = async (chambre, sourceId, cibleId, apres) => {
        if (!sourceId || sourceId === cibleId) return;

        const ids = chambre.caissons.map((caisson) => caisson.id);
        if (!ids.includes(sourceId) || !ids.includes(cibleId)) return;

        const ordre = ids.filter((id) => id !== sourceId);
        const cible = ordre.indexOf(cibleId);
        ordre.splice(cible + (apres ? 1 : 0), 0, sourceId);

        if (ordre.every((id, index) => id === ids[index])) return;

        const caissonsOrdonnes = ordre
            .map((id) =>
                chambre.caissons.find((caisson) => caisson.id === id)
            )
            .filter(Boolean);

        const remplacerCaissons = (liste) =>
            liste.map((c) =>
                c.id === chambre.id
                    ? { ...c, caissons: caissonsOrdonnes }
                    : c
            );

        setPlan((actuel) =>
            actuel
                ? { ...actuel, chambres: remplacerCaissons(actuel.chambres) }
                : actuel
        );
        setChambres(remplacerCaissons);

        try {
            await api.emplacements.caissons.reordonner(chambre.id, ordre);
        } catch (error) {
            await charger();
            showNotif(
                "error",
                "Réorganisation impossible",
                messageErreur(
                    error,
                    "L'ordre des caissons n'a pas été enregistré."
                )
            );
        }
    };

    /* ---------- FICHE CORPS ---------- */

    const ouvrirCorps = (corps, contexte = {}) => {
        setChoixCaisson(false);
        setCaissonsDisponibles([]);
        setCaissonChoisi("");
        setCorpsSelectionne({ corps, ...contexte });
    };

    const fermerCorps = () => {
        if (actionCorps || envoi) return;
        setCorpsSelectionne(null);
    };

    const demanderScelle = (corps) => {
        const sceller = !corps.scelle;

        setConfirmation({
            titre: sceller ? "Sceller le corps ?" : "Desceller le corps ?",
            message: sceller
                ? `« ${nomComplet(corps)} » ne pourra plus être déplacé, modifié ni sorti tant qu'il reste scellé.`
                : `« ${nomComplet(corps)} » redeviendra modifiable et pourra être déplacé.`,
            label: sceller ? "Sceller" : "Desceller",
            type: sceller ? "warning" : "info",
            action: async () => {
                try {
                    setEnvoi(true);

                    if (sceller) {
                        await api.depots.sceller(corps.id);
                    } else {
                        await api.depots.desceller(corps.id);
                    }

                    await charger();
                    setCorpsSelectionne(null);
                    setConfirmation(null);
                    showNotif(
                        "success",
                        sceller ? "Corps scellé" : "Corps descellé",
                        `« ${nomComplet(corps)} » a été mis à jour.`
                    );
                } catch (error) {
                    showNotif(
                        "error",
                        "Échec",
                        messageErreur(
                            error,
                            "Impossible de modifier l'état du scellé."
                        )
                    );
                } finally {
                    setEnvoi(false);
                }
            },
        });
    };

    const ouvrirChoixCaisson = async (corps) => {
        setChoixCaisson(true);
        setCaissonChoisi("");
        setCaissonsDisponibles([]);
        setChargementCaissons(true);

        try {
            const data = await api.depots.caissonsDisponibles(corps.id);
            setCaissonsDisponibles(asList(data, "chambres"));
        } catch (error) {
            setChoixCaisson(false);
            showNotif(
                "error",
                "Échec",
                messageErreur(error, "Impossible de charger les caissons.")
            );
        } finally {
            setChargementCaissons(false);
        }
    };

    const attribuerCaisson = async () => {
        if (!caissonChoisi || !corpsSelectionne) return;

        try {
            setActionCorps(true);

            const reponse = await api.depots.assignBox(
                corpsSelectionne.corps.id,
                Number(caissonChoisi)
            );

            await charger();
            setCorpsSelectionne(null);
            setChoixCaisson(false);
            showNotif(
                "success",
                "Caisson attribué",
                reponse?.message || "Le caisson a été attribué."
            );
        } catch (error) {
            showNotif(
                "error",
                "Échec",
                messageErreur(error, "Impossible d'attribuer le caisson.")
            );
        } finally {
            setActionCorps(false);
        }
    };

    const allerVers = (chemin) => {
        setCorpsSelectionne(null);
        navigate(chemin);
    };

    /* ---------- AFFICHAGE ---------- */

    return (
        <div className="emp-page">
            <header className="emp-entete">
                <div>
                    <h1>Emplacements des corps</h1>
                    <p>
                        Chambres froides communes ou individuelles et leurs
                        caissons.
                    </p>
                </div>

                {peutGerer && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={ouvrirCreation}
                    >
                        + Nouvelle chambre froide
                    </button>
                )}
            </header>

            <div
                className="emp-onglets"
                role="tablist"
                aria-label="Vue des emplacements"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={vue === "plan"}
                    className={`emp-onglet ${vue === "plan" ? "actif" : ""}`}
                    onClick={() => setVue("plan")}
                >
                    Plan d'occupation
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={vue === "gestion"}
                    className={`emp-onglet ${vue === "gestion" ? "actif" : ""}`}
                    onClick={() => setVue("gestion")}
                >
                    Gestion des chambres
                </button>
            </div>

            {vue === "plan" ? (
                chargement ? (
                    <div className="emp-vide">Chargement du plan…</div>
                ) : !plan ||
                  (plan.chambres.length === 0 &&
                      plan.non_attribues.length === 0) ? (
                    <div className="emp-vide">
                        <strong>Aucune chambre froide enregistrée.</strong>
                        <span>
                            Créez une chambre dans l'onglet Gestion pour
                            afficher le plan d'occupation.
                        </span>
                    </div>
                ) : (
                    <div className="emp-plan">
                        <div className="emp-plan-resume">
                            <div className="emp-plan-stat">
                                <strong>{plan.totaux.occupes}</strong>
                                <span>caissons occupés</span>
                            </div>
                            <div className="emp-plan-stat">
                                <strong>{plan.totaux.caissons}</strong>
                                <span>caissons au total</span>
                            </div>
                            <div className="emp-plan-stat">
                                <strong>{plan.totaux.corps}</strong>
                                <span>corps placés</span>
                            </div>
                            <div className="emp-plan-stat alerte">
                                <strong>{plan.totaux.non_attribues}</strong>
                                <span>corps non attribués</span>
                            </div>
                        </div>

                        <div className="emp-plan-chambres">
                            {plan.chambres.map((chambre) => {
                                const occupes = chambre.caissons.filter(
                                    (caisson) => caisson.corps.length > 0
                                ).length;

                                return (
                                    <section
                                        key={chambre.id}
                                        className={`emp-plan-chambre ${
                                            chambre.actif ? "" : "inactive"
                                        }`}
                                    >
                                        <header className="emp-plan-tete">
                                            <div>
                                                <h2>{chambre.nom}</h2>
                                                <span
                                                    className={`emp-badge emp-badge-${chambre.type}`}
                                                >
                                                    {TYPES[chambre.type] ||
                                                        chambre.type}
                                                </span>
                                            </div>
                                            <span className="emp-plan-compte">
                                                {occupes}/
                                                {chambre.caissons.length}
                                            </span>
                                        </header>

                                        {peutGerer &&
                                            chambre.caissons.length > 1 && (
                                                <p className="emp-plan-aide">
                                                    Glissez-déposez un caisson
                                                    pour changer son ordre.
                                                </p>
                                            )}

                                        {chambre.caissons.length === 0 ? (
                                            <p className="emp-aucun-caisson">
                                                Aucun caisson.
                                            </p>
                                        ) : (
                                            <div className="emp-plan-grille">
                                                {chambre.caissons.map(
                                                    (caisson) => {
                                                        const occupe =
                                                            caisson.corps
                                                                .length > 0;

                                                        return (
                                                            <div
                                                                key={caisson.id}
                                                                className={`emp-plan-caisson ${
                                                                    occupe
                                                                        ? "occupe"
                                                                        : "libre"
                                                                } ${
                                                                    caisson.actif
                                                                        ? ""
                                                                        : "inactif"
                                                                } ${
                                                                    peutGerer
                                                                        ? "deplacable"
                                                                        : ""
                                                                } ${
                                                                    dragCaissonId ===
                                                                    caisson.id
                                                                        ? "en-deplacement"
                                                                        : ""
                                                                } ${
                                                                    dropCible?.id ===
                                                                    caisson.id
                                                                        ? dropCible.apres
                                                                            ? "drop-apres"
                                                                            : "drop-avant"
                                                                        : ""
                                                                }`}
                                                                draggable={
                                                                    peutGerer
                                                                }
                                                                onDragStart={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        !peutGerer
                                                                    )
                                                                        return;
                                                                    setDragCaissonId(
                                                                        caisson.id
                                                                    );
                                                                    e.dataTransfer.effectAllowed =
                                                                        "move";
                                                                    e.dataTransfer.setData(
                                                                        "text/plain",
                                                                        String(
                                                                            caisson.id
                                                                        )
                                                                    );
                                                                }}
                                                                onDragOver={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        !peutGerer ||
                                                                        dragCaissonId ===
                                                                            null ||
                                                                        dragCaissonId ===
                                                                            caisson.id
                                                                    )
                                                                        return;
                                                                    e.preventDefault();
                                                                    e.dataTransfer.dropEffect =
                                                                        "move";
                                                                    const rect =
                                                                        e.currentTarget.getBoundingClientRect();
                                                                    const apres =
                                                                        e.clientX >
                                                                        rect.left +
                                                                            rect.width /
                                                                                2;
                                                                    setDropCible(
                                                                        (
                                                                            actuel
                                                                        ) =>
                                                                            actuel?.id ===
                                                                                caisson.id &&
                                                                            actuel?.apres ===
                                                                                apres
                                                                                ? actuel
                                                                                : {
                                                                                      id: caisson.id,
                                                                                      apres,
                                                                                  }
                                                                    );
                                                                }}
                                                                onDragLeave={() =>
                                                                    setDropCible(
                                                                        (
                                                                            actuel
                                                                        ) =>
                                                                            actuel?.id ===
                                                                            caisson.id
                                                                                ? null
                                                                                : actuel
                                                                    )
                                                                }
                                                                onDrop={(e) => {
                                                                    if (
                                                                        !peutGerer ||
                                                                        dragCaissonId ===
                                                                            null
                                                                    )
                                                                        return;
                                                                    e.preventDefault();
                                                                    const rect =
                                                                        e.currentTarget.getBoundingClientRect();
                                                                    const apres =
                                                                        e.clientX >
                                                                        rect.left +
                                                                            rect.width /
                                                                                2;
                                                                    deplacerCaisson(
                                                                        chambre,
                                                                        dragCaissonId,
                                                                        caisson.id,
                                                                        apres
                                                                    );
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDragCaissonId(
                                                                        null
                                                                    );
                                                                    setDropCible(
                                                                        null
                                                                    );
                                                                }}
                                                            >
                                                                <span className="emp-plan-code">
                                                                    {caisson.code}
                                                                </span>

                                                                {occupe ? (
                                                                    <div className="emp-plan-occupants">
                                                                        {caisson.corps.map(
                                                                            (
                                                                                corps
                                                                            ) => (
                                                                                <button
                                                                                    key={
                                                                                        corps.id
                                                                                    }
                                                                                    type="button"
                                                                                    className="emp-plan-corps"
                                                                                    onClick={() =>
                                                                                        ouvrirCorps(
                                                                                            corps,
                                                                                            {
                                                                                                caisson,
                                                                                                chambre,
                                                                                            }
                                                                                        )
                                                                                    }
                                                                                    title={`Ouvrir la fiche de ${nomComplet(corps)}`}
                                                                                >
                                                                                    {corps.scelle && (
                                                                                        <span
                                                                                            className="emp-plan-verrou"
                                                                                            aria-label="Scellé"
                                                                                        >
                                                                                            🔒
                                                                                        </span>
                                                                                    )}
                                                                                    {nomComplet(
                                                                                        corps
                                                                                    )}
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="emp-plan-libre">
                                                                        <IconeCaissonFroid />
                                                                        <span>
                                                                            {caisson.actif
                                                                                ? "Libre"
                                                                                : "Inactif"}
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>

                        <section className="emp-plan-attente">
                            <div className="emp-plan-attente-tete">
                                <h2>Corps non attribués</h2>
                                <span>{plan.non_attribues.length}</span>
                            </div>

                            {plan.non_attribues.length === 0 ? (
                                <p className="emp-aucun-caisson">
                                    Tous les corps présents ont un caisson.
                                </p>
                            ) : (
                                <>
                                    <ul className="emp-plan-liste">
                                        {plan.non_attribues.map((corps) => (
                                            <li key={corps.id}>
                                                <button
                                                    type="button"
                                                    className="emp-plan-attente-item"
                                                    onClick={() =>
                                                        ouvrirCorps(corps)
                                                    }
                                                >
                                                    <span className="emp-plan-attente-nom">
                                                        {corps.nom}{" "}
                                                        {corps.prenom}
                                                    </span>
                                                    <span className="emp-plan-attente-meta">
                                                        {corps.code_defunt ||
                                                            corps.code}{" "}
                                                        · arrivé le{" "}
                                                        {formatDateCourte(
                                                            corps.date_arrivee
                                                        )}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="emp-plan-attente-aide">
                                        Cliquez sur un nom pour ouvrir sa fiche
                                        et lui attribuer un caisson.
                                    </p>
                                </>
                            )}
                        </section>
                    </div>
                )
            ) : chargement ? (
                <div className="emp-vide">Chargement des emplacements…</div>
            ) : chambres.length === 0 ? (
                <div className="emp-vide">
                    <strong>Aucune chambre froide enregistrée.</strong>
                    <span>
                        Créez une première chambre pour pouvoir y rattacher des
                        caissons.
                    </span>
                </div>
            ) : (
                <div className="emp-grille">
                    {chambres.map((chambre) => {
                        const actifs = chambre.caissons.filter(
                            (caisson) => caisson.actif
                        ).length;

                        return (
                            <article
                                key={chambre.id}
                                className={`emp-carte ${
                                    chambre.actif ? "" : "emp-carte-inactive"
                                }`}
                            >
                                <div className="emp-carte-tete">
                                    <div>
                                        <h2>{chambre.nom}</h2>
                                        <span
                                            className={`emp-badge emp-badge-${chambre.type}`}
                                        >
                                            {TYPES[chambre.type] ||
                                                chambre.type}
                                        </span>
                                    </div>

                                    <span
                                        className={`emp-etat ${
                                            chambre.actif ? "actif" : "inactif"
                                        }`}
                                    >
                                        {chambre.actif ? "Active" : "Inactive"}
                                    </span>
                                </div>

                                {chambre.description && (
                                    <p className="emp-description">
                                        {chambre.description}
                                    </p>
                                )}

                                <div className="emp-caissons-titre">
                                    <span>Caissons</span>
                                    <span>
                                        {actifs}/{chambre.caissons.length}{" "}
                                        actif{actifs > 1 ? "s" : ""}
                                    </span>
                                </div>

                                <div className="emp-caissons">
                                    {chambre.caissons.length === 0 && (
                                        <span className="emp-aucun-caisson">
                                            Aucun caisson pour l'instant.
                                        </span>
                                    )}

                                    {chambre.caissons.map((caisson) => (
                                        <div
                                            key={caisson.id}
                                            className={`emp-caisson ${
                                                caisson.actif
                                                    ? ""
                                                    : "emp-caisson-inactif"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="emp-caisson-code"
                                                onClick={() =>
                                                    basculerCaisson(caisson)
                                                }
                                                disabled={!peutGerer}
                                                title={
                                                    peutGerer
                                                        ? caisson.actif
                                                            ? "Désactiver ce caisson"
                                                            : "Réactiver ce caisson"
                                                        : caisson.code
                                                }
                                            >
                                                {caisson.code}
                                            </button>

                                            {peutGerer && (
                                                <button
                                                    type="button"
                                                    className="emp-caisson-renommer"
                                                    onClick={() =>
                                                        ouvrirRenommageCaisson(
                                                            chambre,
                                                            caisson
                                                        )
                                                    }
                                                    title="Renommer ce caisson"
                                                    aria-label={`Renommer le caisson ${caisson.code}`}
                                                >
                                                    ✎
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {peutGerer && (
                                    <div className="emp-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() =>
                                                ouvrirAjoutCaisson(chambre)
                                            }
                                        >
                                            + Caisson
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() =>
                                                ouvrirEdition(chambre)
                                            }
                                        >
                                            Modifier
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm ${
                                                chambre.actif
                                                    ? "emp-btn-desactiver"
                                                    : "btn-secondary"
                                            }`}
                                            onClick={() =>
                                                demanderBasculeChambre(chambre)
                                            }
                                        >
                                            {chambre.actif
                                                ? "Désactiver"
                                                : "Réactiver"}
                                        </button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {/* MODALE CHAMBRE */}
            {formChambre && (
                <div
                    className="emp-modal-fond"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) fermerFormChambre();
                    }}
                >
                    <form className="emp-modal" onSubmit={enregistrerChambre}>
                        <h2>
                            {formChambre.id
                                ? "Modifier la chambre froide"
                                : "Nouvelle chambre froide"}
                        </h2>

                        <label className="emp-champ">
                            <span>Nom</span>
                            <input
                                className="input"
                                type="text"
                                value={formChambre.nom}
                                onChange={(e) =>
                                    setFormChambre((form) => ({
                                        ...form,
                                        nom: e.target.value,
                                    }))
                                }
                                placeholder="Ex. Chambre froide 1"
                                maxLength={100}
                                required
                                autoFocus
                            />
                        </label>

                        <label className="emp-champ">
                            <span>Type</span>
                            <select
                                className="select"
                                value={formChambre.type}
                                onChange={(e) =>
                                    setFormChambre((form) => ({
                                        ...form,
                                        type: e.target.value,
                                    }))
                                }
                            >
                                <option value="commune">
                                    Commune (plusieurs caissons)
                                </option>
                                <option value="individuelle">
                                    Individuelle
                                </option>
                            </select>
                        </label>

                        {!formChambre.id && (
                            <label className="emp-champ">
                                <span>Nombre de caissons à créer</span>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formChambre.nombre_caissons}
                                    onChange={(e) =>
                                        setFormChambre((form) => ({
                                            ...form,
                                            nombre_caissons: e.target.value,
                                        }))
                                    }
                                />
                                <small>
                                    Ils seront nommés A1, A2, … Vous pourrez en
                                    ajouter d'autres ensuite.
                                </small>
                            </label>
                        )}

                        <label className="emp-champ">
                            <span>Description (facultatif)</span>
                            <input
                                className="input"
                                type="text"
                                value={formChambre.description}
                                onChange={(e) =>
                                    setFormChambre((form) => ({
                                        ...form,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="Ex. Aile droite du bâtiment"
                                maxLength={255}
                            />
                        </label>

                        <div className="emp-modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={fermerFormChambre}
                                disabled={envoi}
                            >
                                Annuler
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={envoi}
                            >
                                {envoi ? "Enregistrement…" : "Enregistrer"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODALE CAISSON */}
            {formCaisson && (
                <div
                    className="emp-modal-fond"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) fermerFormCaisson();
                    }}
                >
                    <form className="emp-modal" onSubmit={enregistrerCaisson}>
                        <h2>
                            {formCaisson.caissonId
                                ? "Renommer le caisson"
                                : "Ajouter un caisson"}
                        </h2>

                        <p className="emp-modal-aide">
                            Chambre « {formCaisson.chambreNom} »
                        </p>

                        <label className="emp-champ">
                            <span>
                                Code du caisson
                                {formCaisson.caissonId ? "" : " (facultatif)"}
                            </span>
                            <input
                                className="input"
                                type="text"
                                value={formCaisson.code}
                                onChange={(e) =>
                                    setFormCaisson((form) => ({
                                        ...form,
                                        code: e.target.value,
                                    }))
                                }
                                placeholder="Ex. A4"
                                maxLength={20}
                                required={Boolean(formCaisson.caissonId)}
                                autoFocus
                            />
                            {!formCaisson.caissonId && (
                                <small>
                                    Laissez vide pour attribuer automatiquement
                                    le prochain code de la série A1, A2, …
                                </small>
                            )}
                        </label>

                        <div className="emp-modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={fermerFormCaisson}
                                disabled={envoi}
                            >
                                Annuler
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={envoi}
                            >
                                {envoi ? "Enregistrement…" : "Enregistrer"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODALE CORPS */}
            {corpsSelectionne &&
                (() => {
                    const { corps, caisson, chambre } = corpsSelectionne;
                    const nom = nomComplet(corps);
                    const emplacement = caisson
                        ? `${chambre?.nom || "Chambre"} · ${caisson.code}`
                        : corps.caisson_id
                        ? "Caisson attribué"
                        : "Aucun caisson attribué";

                    const peutSceller = can("depots.sceller");
                    const peutAttribuer =
                        can("depots.update") && !corps.scelle;
                    const peutTransferer =
                        can("transferts.create") && !corps.scelle;
                    const peutSortir =
                        can("sorties.create") && !corps.scelle;
                    const peutDeclarer = can("declarations.create");
                    const peutCertificat = can("certificatgenremort.view");
                    const peutFiche = can("depots.view");

                    const aDesActions =
                        peutSceller ||
                        peutAttribuer ||
                        peutTransferer ||
                        peutSortir ||
                        peutDeclarer ||
                        peutCertificat ||
                        peutFiche;

                    return (
                        <div
                            className="emp-modal-fond"
                            onMouseDown={(e) => {
                                if (e.target === e.currentTarget) {
                                    fermerCorps();
                                }
                            }}
                        >
                            <div className="emp-modal emp-modal-corps-fiche">
                                <header className="emp-corps-entete">
                                    <div>
                                        <h2>{nom}</h2>
                                        <p className="emp-modal-aide">
                                            {emplacement}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="emp-modal-fermer"
                                        onClick={fermerCorps}
                                        aria-label="Fermer la fiche"
                                    >
                                        ×
                                    </button>
                                </header>

                                <div className="emp-corps-badges">
                                    <span className="emp-badge emp-badge-present">
                                        PRÉSENT
                                    </span>
                                    {corps.scelle && (
                                        <span className="emp-badge emp-badge-scelle">
                                            🔒 Scellé
                                        </span>
                                    )}
                                    {!corps.caisson_id && (
                                        <span className="emp-badge emp-badge-attente">
                                            Non attribué
                                        </span>
                                    )}
                                </div>

                                <dl className="emp-corps-infos">
                                    <div>
                                        <dt>Code défunt</dt>
                                        <dd>{corps.code_defunt || "-"}</dd>
                                    </div>
                                    <div>
                                        <dt>Dépôt</dt>
                                        <dd>{corps.code || "-"}</dd>
                                    </div>
                                    <div>
                                        <dt>Sexe</dt>
                                        <dd>{libelleSexe(corps.sexe)}</dd>
                                    </div>
                                    <div>
                                        <dt>Âge</dt>
                                        <dd>
                                            {corps.age === null ||
                                            corps.age === undefined
                                                ? "-"
                                                : `${corps.age} ans`}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Profession</dt>
                                        <dd>{corps.profession || "-"}</dd>
                                    </div>
                                    <div>
                                        <dt>Décès</dt>
                                        <dd>
                                            {formatDateCourte(corps.date_deces)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Arrivée</dt>
                                        <dd>
                                            {formatDateCourte(
                                                corps.date_arrivee
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Provenance</dt>
                                        <dd>{corps.provenance || "-"}</dd>
                                    </div>
                                    <div>
                                        <dt>Chapelle</dt>
                                        <dd>{corps.chapelle || "-"}</dd>
                                    </div>
                                </dl>

                                {choixCaisson && (
                                    <div className="emp-corps-caisson">
                                        {chargementCaissons ? (
                                            <p className="emp-modal-aide">
                                                Chargement des caissons…
                                            </p>
                                        ) : caissonsDisponibles.length ===
                                          0 ? (
                                            <p className="emp-modal-aide">
                                                Aucun caisson actif disponible.
                                            </p>
                                        ) : (
                                            <>
                                                <select
                                                    className="select"
                                                    value={caissonChoisi}
                                                    onChange={(e) =>
                                                        setCaissonChoisi(
                                                            e.target.value
                                                        )
                                                    }
                                                    disabled={actionCorps}
                                                    aria-label="Caisson à attribuer"
                                                >
                                                    <option value="">
                                                        Choisir un caisson…
                                                    </option>
                                                    {caissonsDisponibles.map(
                                                        (chambreDispo) => (
                                                            <optgroup
                                                                key={
                                                                    chambreDispo.id
                                                                }
                                                                label={
                                                                    chambreDispo.nom
                                                                }
                                                            >
                                                                {chambreDispo.caissons.map(
                                                                    (caissonDispo) => (
                                                                        <option
                                                                            key={
                                                                                caissonDispo.id
                                                                            }
                                                                            value={
                                                                                caissonDispo.id
                                                                            }
                                                                            disabled={
                                                                                !caissonDispo.disponible &&
                                                                                caissonDispo.id !==
                                                                                    corps.caisson_id
                                                                            }
                                                                        >
                                                                            {
                                                                                caissonDispo.code
                                                                            }
                                                                            {caissonDispo.occupants >
                                                                            0
                                                                                ? ` — ${caissonDispo.occupants} corps`
                                                                                : " — libre"}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </optgroup>
                                                        )
                                                    )}
                                                </select>

                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={attribuerCaisson}
                                                    disabled={
                                                        !caissonChoisi ||
                                                        actionCorps
                                                    }
                                                >
                                                    {actionCorps
                                                        ? "Attribution…"
                                                        : "Attribuer"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {aDesActions ? (
                                    <div className="emp-corps-actions">
                                        {peutSceller && (
                                            <button
                                                type="button"
                                                className={`emp-action ${
                                                    corps.scelle
                                                        ? ""
                                                        : "emp-action-warn"
                                                }`}
                                                onClick={() =>
                                                    demanderScelle(corps)
                                                }
                                                disabled={
                                                    actionCorps || envoi
                                                }
                                            >
                                                {corps.scelle
                                                    ? "🔓 Desceller le corps"
                                                    : "🔒 Sceller le corps"}
                                            </button>
                                        )}

                                        {peutAttribuer && (
                                            <button
                                                type="button"
                                                className="emp-action"
                                                onClick={() =>
                                                    ouvrirChoixCaisson(corps)
                                                }
                                                disabled={
                                                    actionCorps ||
                                                    chargementCaissons
                                                }
                                            >
                                                📦{" "}
                                                {corps.caisson_id
                                                    ? "Changer de caisson"
                                                    : "Attribuer un caisson"}
                                            </button>
                                        )}

                                        {peutTransferer && (
                                            <button
                                                type="button"
                                                className="emp-action"
                                                onClick={() =>
                                                    allerVers(
                                                        `/transfert?depot=${corps.id}`
                                                    )
                                                }
                                            >
                                                🚚 Transférer
                                            </button>
                                        )}

                                        {peutSortir && (
                                            <button
                                                type="button"
                                                className="emp-action"
                                                onClick={() =>
                                                    allerVers(
                                                        `/Sortie?depot=${corps.id}`
                                                    )
                                                }
                                            >
                                                🚪 Enregistrer une sortie
                                            </button>
                                        )}

                                        {peutDeclarer && (
                                            <button
                                                type="button"
                                                className="emp-action"
                                                onClick={() =>
                                                    allerVers(
                                                        `/declarations?depot=${corps.id}`
                                                    )
                                                }
                                            >
                                                📋 Déclaration de décès
                                            </button>
                                        )}

                                        {peutCertificat && (
                                            <button
                                                type="button"
                                                className="emp-action"
                                                onClick={() =>
                                                    allerVers(
                                                        `/certificatgenremort/${corps.id}`
                                                    )
                                                }
                                            >
                                                🧾 Certificat de genre de mort
                                            </button>
                                        )}

                                        {peutFiche && (
                                            <button
                                                type="button"
                                                className="emp-action emp-action-principal"
                                                onClick={() =>
                                                    allerVers(
                                                        `/DepotCorps?depot=${corps.id}`
                                                    )
                                                }
                                            >
                                                👁 Ouvrir la fiche complète
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="emp-modal-aide">
                                        Aucune action supplémentaire autorisée
                                        pour votre rôle.
                                    </p>
                                )}

                                <div className="emp-modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={fermerCorps}
                                        disabled={actionCorps || envoi}
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

            <ConfirmDialog
                open={Boolean(confirmation)}
                title={confirmation?.titre}
                message={confirmation?.message}
                confirmLabel={confirmation?.label}
                type={confirmation?.type}
                loading={envoi}
                onConfirm={() => confirmation?.action?.()}
                onCancel={() => {
                    if (!envoi) setConfirmation(null);
                }}
            />

            <NotificationBox
                open={Boolean(notif)}
                type={notif?.type}
                title={notif?.title}
                message={notif?.message}
                onClose={() => setNotif(null)}
            />
        </div>
    );
}

export default Emplacements;
