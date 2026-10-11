import React, { useEffect, useMemo, useState } from "react";
import "./DashboardDeclaration.css";
import DeclarationDeces from "./DeclarationDeces";

import api, { asList } from "../services/api";
import { hasPermission } from "../services/session";

/* =========================================================
   OUTILS
========================================================= */

const aujourdHui = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
};

const formatMontant = (value) =>
    new Intl.NumberFormat("fr-FR").format(Number(value || 0));

const valeur = (objet, ...cles) => {
    for (const cle of cles) {
        if (
            objet?.[cle] !== undefined &&
            objet?.[cle] !== null &&
            objet?.[cle] !== ""
        ) {
            return objet[cle];
        }
    }
    return "";
};

const nomDefunt = (depot) => {
    if (!depot) return "";
    return `${depot.nom || ""} ${depot.prenom || ""}`.trim();
};

const dateCourte = (date) => {
    if (!date) return "-";
    return String(date).substring(0, 10);
};

/* =========================================================
   COMPOSANT
========================================================= */

export default function DashboardDeclaration() {
    /* ---------- ÉTATS ---------- */

    const [declarations, setDeclarations] = useState([]);
    const [depots, setDepots] = useState([]);

    const [dashboard, setDashboard] = useState({
        total: 0,
        cette_annee: 0,
        ce_mois: 0,
        enregistrees: 0,
        brouillons: 0,
    });

    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState("");
    const [message, setMessage] = useState("");

    const [recherche, setRecherche] = useState("");
    const [filtreStatut, setFiltreStatut] = useState("TOUS");

    const [modal, setModal] = useState(false);

    const [form, setForm] = useState({});

    /* ⚠️ Nouvel état : déclaration à imprimer */
    const [declarationAImprimer, setDeclarationAImprimer] = useState(null);

    /* =====================================================
       FORMULAIRE VIDE
    ===================================================== */

    const formulaireVide = () => ({
        depot_id: "",
        region: "",
        departement: "",
        arrondissement: "",
        district_sante: "",
        aire_sante: "",
        formation_sanitaire: "",
        ville_village_quartier: "",

        nom: "",
        prenom: "",
        sexe: "",
        date_naissance: "",
        age: "",
        lieu_naissance: "",
        nationalite: "",
        cni_autre: "",
        profession: "",
        domicile: "",
        statut_matrimonial: "",

        date_deces: "",
        heure_deces: "",
        lieu_deces: "",
        site_deces: "",
        circonstances_deces: "",

        declarant_nom: "",
        declarant_qualite: "",
        declarant_contact: "",
        declarant_date: aujourdHui(),

        officier_nom: "",
        officier_qualite: "",
        centre_etat_civil: "",
        date_reception: "",

        cause_a: "",
        cause_b: "",
        cause_c: "",
        cause_d: "",
        autres_affections: "",

        chirurgie_recente: "",
        date_chirurgie: "",
        raison_chirurgie: "",
        autopsie: "",
        resultats_autopsie_utilises: "",

        cause_mort: "",
        cause_externe: "",
        cause_indeterminee: "",
        date_blessure: "",
        description_cause_externe: "",
        lieu_cause_externe: "",

        grossesse_multiple: "",
        mort_ne: "",
        heures_survecues: "",
        poids_naissance: "",
        semaines_grossesse: "",
        age_mere: "",
        conditions_mere: "",
        defunte_enceinte: "",
        grossesse_contribue_deces: "",

        responsable_nom: "",
        responsable_qualite: "",
        responsable_date: aujourdHui(),
        responsable_signature: "",

        statut: "ENREGISTRÉE",
    });

    /* =====================================================
       CHARGEMENT
    ===================================================== */

    const charger = async () => {
        setChargement(true);
        setErreur("");

        try {
            const [declarationsData, dashboardData, depotsData] =
                await Promise.all([
                    api.declarations.list(),
                    api.declarations.dashboard(),
                    api.declarations.defunts(),
                ]);

            const listeDeclarations = asList(declarationsData);
            const listeDepots = asList(depotsData);

            setDeclarations(listeDeclarations);
            setDepots(listeDepots);
            setDashboard(dashboardData || {});
        } catch (error) {
            console.error("Erreur déclarations :", error);
            setErreur(
                error.firstMessage ||
                    "Impossible de charger les déclarations."
            );
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        charger();
    }, []);

    /* =====================================================
       NOUVELLE DÉCLARATION
    ===================================================== */

    const nouvelleDeclaration = () => {
        setForm(formulaireVide());
        setErreur("");
        setMessage("");
        setModal(true);
    };

    /* =====================================================
       CHOIX DU DÉFUNT
    ===================================================== */

    const choisirDefunt = async (event) => {
        const depotId = event.target.value;

        if (!depotId) {
            setForm(formulaireVide());
            return;
        }

        try {
            const depot = await api.declarations.depot(depotId);
            const nouveauForm = formulaireVide();

            nouveauForm.depot_id = depot.id;
            nouveauForm.nom = valeur(depot, "nom");
            nouveauForm.prenom = valeur(depot, "prenom");
            nouveauForm.sexe = valeur(depot, "sexe");
            nouveauForm.date_naissance = dateCourte(
                valeur(depot, "date_naissance", "dateNaissance")
            );
            nouveauForm.age = valeur(depot, "age");
            nouveauForm.profession = valeur(depot, "profession");
            nouveauForm.date_deces = dateCourte(
                valeur(depot, "date_deces", "dateDeces")
            );
            nouveauForm.heure_deces = valeur(
                depot,
                "heure_deces",
                "heureDeces"
            );
            nouveauForm.lieu_deces = valeur(
                depot,
                "lieu_deces",
                "lieuDeces"
            );
            nouveauForm.site_deces = valeur(depot, "provenance");

            setForm(nouveauForm);
        } catch (error) {
            console.error(error);
            setErreur(
                "Impossible de récupérer les informations du dépôt."
            );
        }
    };

    /* =====================================================
       CHANGEMENT
    ===================================================== */

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((ancien) => ({ ...ancien, [name]: value }));
        setErreur("");
    };

    /* =====================================================
       ENREGISTRER
    ===================================================== */

    const enregistrer = async (event) => {
        event.preventDefault();
        setErreur("");
        setMessage("");

        if (!form.depot_id) {
            setErreur(
                "Veuillez sélectionner un défunt provenant des dépôts."
            );
            return;
        }

        if (!form.nom) {
            setErreur("Le nom du défunt est obligatoire.");
            return;
        }

        if (!form.date_deces) {
            setErreur("La date du décès est obligatoire.");
            return;
        }

        try {
            await api.declarations.create(form);

            setModal(false);
            setMessage(
                "La déclaration de décès a été enregistrée avec succès."
            );

            await charger();
        } catch (error) {
            console.error(error);
            setErreur(
                error.firstMessage ||
                    "Impossible d'enregistrer la déclaration."
            );
        }
    };

    /* =====================================================
       SUPPRIMER
    ===================================================== */

    const supprimer = async (declaration) => {
        const ok = window.confirm(
            `Supprimer la déclaration ${declaration.numero_declaration} ?`
        );

        if (!ok) return;

        try {
            await api.declarations.remove(declaration.id);
            setMessage("Déclaration supprimée.");
            await charger();
        } catch (error) {
            setErreur(
                error.firstMessage ||
                    "Impossible de supprimer la déclaration."
            );
        }
    };

    /* =====================================================
       MODIFIER
    ===================================================== */

    const modifier = (declaration) => {
        setForm({
            ...formulaireVide(),
            ...declaration,
            depot_id: declaration.depot_id,
            date_naissance: dateCourte(declaration.date_naissance),
            date_deces: dateCourte(declaration.date_deces),
            date_chirurgie: dateCourte(declaration.date_chirurgie),
            declarant_date: dateCourte(declaration.declarant_date),
            date_reception: dateCourte(declaration.date_reception),
            responsable_date: dateCourte(declaration.responsable_date),
        });

        setForm((ancien) => ({ ...ancien, id: declaration.id }));
        setModal(true);
    };

    /* =====================================================
       ENREGISTRER MODIFICATION
    ===================================================== */

    const sauvegarderModification = async (event) => {
        event.preventDefault();

        if (!form.id) return;

        try {
            await api.declarations.update(form.id, form);
            setModal(false);
            setMessage("Déclaration modifiée avec succès.");
            await charger();
        } catch (error) {
            setErreur(
                error.firstMessage ||
                    "Impossible de modifier la déclaration."
            );
        }
    };

    /* =====================================================
       FILTRE
    ===================================================== */

    const declarationsFiltrees = useMemo(() => {
        const terme = recherche.trim().toLowerCase();

        return declarations.filter((declaration) => {
            const texte = [
                declaration.numero_declaration,
                declaration.nom,
                declaration.prenom,
                declaration.declarant_nom,
                declaration.date_deces,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const rechercheOK = !terme || texte.includes(terme);

            const statutOK =
                filtreStatut === "TOUS" ||
                declaration.statut === filtreStatut;

            return rechercheOK && statutOK;
        });
    }, [declarations, recherche, filtreStatut]);

    /* =====================================================
       IMPRESSION → utilise DeclarationDeces
    ===================================================== */

    const imprimer = (declaration) => {
        setDeclarationAImprimer(declaration);

        /* On attend que le composant soit rendu avant d'imprimer */
        setTimeout(() => {
            window.print();
        }, 500);
    };

    /* =====================================================
       FERMER L'IMPRESSION APRÈS
    ===================================================== */

    useEffect(() => {
        const gererApresImpression = () => {
            /* Rien à faire ici, on garde la déclaration affichée */
        };

        window.addEventListener("afterprint", gererApresImpression);

        return () => {
            window.removeEventListener("afterprint", gererApresImpression);
        };
    }, []);

    /* =====================================================
       RENDU
    ===================================================== */

    return (
        <div className="declaration-page">
            {/* HEADER */}
            <div className="declaration-header">
                <div>
                    <h1>Déclarations de décès</h1>
                </div>

                {hasPermission("declarations.create") && (
                    <button className="btn-primary" onClick={nouvelleDeclaration}>
                        Nouvelle déclaration
                    </button>
                )}
            </div>

            {message && (
                <div className="declaration-alert success">
                    ✓
                    <span>{message}</span>
                    <button onClick={() => setMessage("")}>×</button>
                </div>
            )}

            {erreur && !modal && (
                <div className="declaration-alert error">
                    ⚠
                    <span>{erreur}</span>
                    <button onClick={() => setErreur("")}>×</button>
                </div>
            )}

            {/* STATS */}
            <div className="declaration-stats">
                <div className="stat-card">
                    <span>Total</span>
                    <strong>{dashboard.total || 0}</strong>
                </div>
                <div className="stat-card">
                    <span>Cette année</span>
                    <strong>{dashboard.cette_annee || 0}</strong>
                </div>
                <div className="stat-card">
                    <span>Ce mois</span>
                    <strong>{dashboard.ce_mois || 0}</strong>
                </div>
                <div className="stat-card">
                    <span>Enregistrées</span>
                    <strong>{dashboard.enregistrees || 0}</strong>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="declaration-card">
                <div className="declaration-toolbar">
                    <div className="declaration-search">
                        🔎
                        <input
                            type="text"
                            placeholder="Rechercher par nom, numéro..."
                            value={recherche}
                            onChange={(event) =>
                                setRecherche(event.target.value)
                            }
                        />
                    </div>

                    <select
                        value={filtreStatut}
                        onChange={(event) =>
                            setFiltreStatut(event.target.value)
                        }
                    >
                        <option value="TOUS">Toutes</option>
                        <option value="ENREGISTRÉE">Enregistrées</option>
                        <option value="BROUILLON">Brouillons</option>
                    </select>
                </div>

                {chargement ? (
                    <div className="declaration-loading">Chargement...</div>
                ) : declarationsFiltrees.length === 0 ? (
                    <div className="declaration-empty">
                        <div>📄</div>
                        <h3>Aucune déclaration</h3>
                        <p>
                            Les déclarations enregistrées apparaîtront ici.
                        </p>
                    </div>
                ) : (
                    <div className="declaration-table-wrapper">
                        <table className="declaration-table">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Défunt</th>
                                    <th>Sexe</th>
                                    <th>Date naissance</th>
                                    <th>Date décès</th>
                                    <th>Déclarant</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {declarationsFiltrees.map((declaration) => (
                                    <tr key={declaration.id}>
                                        <td>
                                            <span className="numero-badge">
                                                {declaration.numero_declaration}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>
                                                {declaration.nom}{" "}
                                                {declaration.prenom}
                                            </strong>
                                        </td>
                                        <td>{declaration.sexe || "-"}</td>
                                        <td>
                                            {dateCourte(
                                                declaration.date_naissance
                                            )}
                                        </td>
                                        <td>
                                            {dateCourte(declaration.date_deces)}
                                        </td>
                                        <td>
                                            {declaration.declarant_nom || "-"}
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    declaration.statut ===
                                                    "ENREGISTRÉE"
                                                        ? "status-success"
                                                        : "status-draft"
                                                }
                                            >
                                                {declaration.statut}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="declaration-actions">
                                                {hasPermission("declarations.update") && (
                                                    <button
                                                        title="Modifier"
                                                        onClick={() =>
                                                            modifier(declaration)
                                                        }
                                                    >
                                                        ✎
                                                    </button>
                                                )}
                                                <button
                                                    title="Imprimer"
                                                    onClick={() =>
                                                        imprimer(declaration)
                                                    }
                                                >
                                                    🖨
                                                </button>
                                                {hasPermission("declarations.delete") && (
                                                    <button
                                                        className="delete"
                                                        title="Supprimer"
                                                        onClick={() =>
                                                            supprimer(declaration)
                                                        }
                                                    >
                                                        🗑
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODALE FORMULAIRE */}
            {modal && (
                <div className="declaration-modal-overlay">
                    <div className="declaration-modal">
                        <div className="declaration-modal-header">
                            <div>
                                <h2>
                                    {form.id
                                        ? "Modifier la déclaration"
                                        : "Nouvelle déclaration de décès"}
                                </h2>
                            </div>
                            <button
                                className="close-modal"
                                onClick={() => setModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                form.id
                                    ? sauvegarderModification
                                    : enregistrer
                            }
                        >
                            {erreur && (
                                <div className="form-error">⚠ {erreur}</div>
                            )}

                            {/* DÉPÔT */}
                            <section>
                                <h3>1. Sélection du défunt</h3>
                                <div className="form-grid">
                                    <div className="form-group full">
                                        <select
                                            value={form.depot_id || ""}
                                            onChange={choisirDefunt}
                                            required
                                            disabled={Boolean(form.id)}
                                        >
                                            <option value="">
                                                Sélectionner un défunt
                                            </option>
                                            {depots.map((depot) => (
                                                <option
                                                    key={depot.id}
                                                    value={depot.id}
                                                >
                                                    {depot.code ||
                                                        `DEP-${String(
                                                            depot.id
                                                        ).padStart(4, "0")}`}{" "}
                                                    — {nomDefunt(depot)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* INFORMATIONS DÉFUNT */}
                            <section>
                                <h3>2. Informations sur le défunt</h3>
                                <div className="form-grid">
                                    <Champ
                                        label="Nom *"
                                        name="nom"
                                        value={form.nom}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Prénom(s)"
                                        name="prenom"
                                        value={form.prenom}
                                        onChange={handleChange}
                                    />
                                    <ChampSelect
                                        label="Sexe"
                                        name="sexe"
                                        value={form.sexe}
                                        onChange={handleChange}
                                        options={["Masculin", "Féminin"]}
                                    />
                                    <Champ
                                        label="Date de naissance"
                                        name="date_naissance"
                                        type="date"
                                        value={form.date_naissance}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Âge"
                                        name="age"
                                        type="number"
                                        value={form.age}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Lieu de naissance"
                                        name="lieu_naissance"
                                        value={form.lieu_naissance}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Nationalité"
                                        name="nationalite"
                                        value={form.nationalite}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="CNI / Autre"
                                        name="cni_autre"
                                        value={form.cni_autre}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Profession"
                                        name="profession"
                                        value={form.profession}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Domicile"
                                        name="domicile"
                                        value={form.domicile}
                                        onChange={handleChange}
                                    />
                                    <ChampSelect
                                        label="Statut matrimonial"
                                        name="statut_matrimonial"
                                        value={form.statut_matrimonial}
                                        onChange={handleChange}
                                        options={[
                                            "Célibataire",
                                            "Marié(e)",
                                            "Divorcé(e)",
                                            "Veuf(ve)",
                                        ]}
                                    />
                                </div>
                            </section>

                            {/* DÉCÈS */}
                            <section>
                                <h3>3. Informations sur le décès</h3>
                                <div className="form-grid">
                                    <Champ
                                        label="Date du décès *"
                                        name="date_deces"
                                        type="date"
                                        value={form.date_deces}
                                        onChange={handleChange}
                                        required
                                    />
                                    <Champ
                                        label="Heure du décès"
                                        name="heure_deces"
                                        type="time"
                                        value={form.heure_deces}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Lieu du décès"
                                        name="lieu_deces"
                                        value={form.lieu_deces}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Site du décès"
                                        name="site_deces"
                                        value={form.site_deces}
                                        onChange={handleChange}
                                    />
                                </div>
                                <ChampTextarea
                                    label="Circonstances du décès"
                                    name="circonstances_deces"
                                    value={form.circonstances_deces}
                                    onChange={handleChange}
                                />
                            </section>

                            {/* DÉCLARANT */}
                            <section>
                                <h3>4. Informations sur le déclarant</h3>
                                <div className="form-grid">
                                    <Champ
                                        label="Nom et prénoms"
                                        name="declarant_nom"
                                        value={form.declarant_nom}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Qualité / Statut"
                                        name="declarant_qualite"
                                        value={form.declarant_qualite}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Contact"
                                        name="declarant_contact"
                                        value={form.declarant_contact}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Date"
                                        name="declarant_date"
                                        type="date"
                                        value={form.declarant_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </section>

                            {/* CAUSES */}
                            <section>
                                <h3>6. Causes médicales du décès</h3>
                                <div className="cause-grid">
                                    <ChampTextarea
                                        label="a — Cause directe"
                                        name="cause_a"
                                        value={form.cause_a}
                                        onChange={handleChange}
                                    />
                                    <ChampTextarea
                                        label="b — Due à"
                                        name="cause_b"
                                        value={form.cause_b}
                                        onChange={handleChange}
                                    />
                                    <ChampTextarea
                                        label="c — Due à"
                                        name="cause_c"
                                        value={form.cause_c}
                                        onChange={handleChange}
                                    />
                                    <ChampTextarea
                                        label="d — Due à"
                                        name="cause_d"
                                        value={form.cause_d}
                                        onChange={handleChange}
                                    />
                                </div>
                                <ChampTextarea
                                    label="Autres affections importantes"
                                    name="autres_affections"
                                    value={form.autres_affections}
                                    onChange={handleChange}
                                />
                            </section>

                            {/* AUTRES DONNÉES MÉDICALES */}
                            <section>
                                <h3>7. Autres données médicales</h3>
                                <div className="form-grid">
                                    <ChampSelect
                                        label="Intervention chirurgicale récente"
                                        name="chirurgie_recente"
                                        value={form.chirurgie_recente}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                    <Champ
                                        label="Date de chirurgie"
                                        name="date_chirurgie"
                                        type="date"
                                        value={form.date_chirurgie}
                                        onChange={handleChange}
                                    />
                                    <ChampSelect
                                        label="Autopsie"
                                        name="autopsie"
                                        value={form.autopsie}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                    <ChampSelect
                                        label="Résultats utilisés"
                                        name="resultats_autopsie_utilises"
                                        value={form.resultats_autopsie_utilises}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                </div>
                                <ChampTextarea
                                    label="Raison de l'intervention chirurgicale"
                                    name="raison_chirurgie"
                                    value={form.raison_chirurgie}
                                    onChange={handleChange}
                                />
                            </section>

                            {/* CAUSE DE MORT */}
                            <section>
                                <h3>8. Cause de mort</h3>
                                <div className="form-grid">
                                    <ChampSelect
                                        label="Cause"
                                        name="cause_mort"
                                        value={form.cause_mort}
                                        onChange={handleChange}
                                        options={[
                                            "Maladie",
                                            "Accident",
                                            "Suicide",
                                            "Intervention légale",
                                            "Inconnue",
                                        ]}
                                    />
                                    <ChampSelect
                                        label="Cause externe"
                                        name="cause_externe"
                                        value={form.cause_externe}
                                        onChange={handleChange}
                                        options={[
                                            "Accident",
                                            "Catastrophe naturelle",
                                            "Suicide",
                                            "Agression",
                                            "Guerre",
                                            "Empoisonnement",
                                            "Inconnue",
                                        ]}
                                    />
                                    <ChampSelect
                                        label="Cause indéterminée"
                                        name="cause_indeterminee"
                                        value={form.cause_indeterminee}
                                        onChange={handleChange}
                                        options={[
                                            "N'a pu être déterminée",
                                            "Enquête en cours",
                                            "Inconnue",
                                        ]}
                                    />
                                    <Champ
                                        label="Date de blessure"
                                        name="date_blessure"
                                        type="date"
                                        value={form.date_blessure}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Lieu de la cause externe"
                                        name="lieu_cause_externe"
                                        value={form.lieu_cause_externe}
                                        onChange={handleChange}
                                    />
                                </div>
                                <ChampTextarea
                                    label="Description de la cause externe"
                                    name="description_cause_externe"
                                    value={form.description_cause_externe}
                                    onChange={handleChange}
                                />
                            </section>

                            {/* MATERNITÉ / INFANTILE */}
                            <section>
                                <h3>9. Mortalité fœtale ou infantile</h3>
                                <div className="form-grid">
                                    <ChampSelect
                                        label="Grossesse multiple"
                                        name="grossesse_multiple"
                                        value={form.grossesse_multiple}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                    <ChampSelect
                                        label="Mort-né"
                                        name="mort_ne"
                                        value={form.mort_ne}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                    <Champ
                                        label="Heures survécues"
                                        name="heures_survecues"
                                        type="number"
                                        value={form.heures_survecues}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Poids à la naissance (g)"
                                        name="poids_naissance"
                                        type="number"
                                        value={form.poids_naissance}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Semaines de grossesse"
                                        name="semaines_grossesse"
                                        type="number"
                                        value={form.semaines_grossesse}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Âge de la mère"
                                        name="age_mere"
                                        type="number"
                                        value={form.age_mere}
                                        onChange={handleChange}
                                    />
                                    <ChampSelect
                                        label="Défunte enceinte"
                                        name="defunte_enceinte"
                                        value={form.defunte_enceinte}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                    <ChampSelect
                                        label="Grossesse contributive"
                                        name="grossesse_contribue_deces"
                                        value={form.grossesse_contribue_deces}
                                        onChange={handleChange}
                                        options={["Oui", "Non", "Inconnu"]}
                                    />
                                </div>
                                <ChampTextarea
                                    label="Conditions de la mère"
                                    name="conditions_mere"
                                    value={form.conditions_mere}
                                    onChange={handleChange}
                                />
                            </section>

                            {/* FORMATION SANITAIRE */}
                            <section>
                                <h3>10. Formation sanitaire</h3>
                                <div className="form-grid">
                                    <Champ
                                        label="Nom du responsable"
                                        name="responsable_nom"
                                        value={form.responsable_nom}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Qualité / Statut"
                                        name="responsable_qualite"
                                        value={form.responsable_qualite}
                                        onChange={handleChange}
                                    />
                                    <Champ
                                        label="Date"
                                        name="responsable_date"
                                        type="date"
                                        value={form.responsable_date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <ChampTextarea
                                    label="Signature"
                                    name="responsable_signature"
                                    value={form.responsable_signature}
                                    onChange={handleChange}
                                />
                            </section>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setModal(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {form.id
                                        ? "Enregistrer les modifications"
                                        : "Enregistrer la déclaration"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
               IMPRESSION → utilise DeclarationDeces
            ================================================= */}

            {declarationAImprimer && (
                <div className="declaration-print-container">
                    <DeclarationDeces declaration={declarationAImprimer} />
                </div>
            )}
        </div>
    );
}

/* =========================================================
   COMPOSANTS DE CHAMP
========================================================= */

function Champ({ label, name, value, onChange, type = "text", required = false }) {
    return (
        <div className="form-group">
            <label>{label}</label>
            <input
                type={type}
                name={name}
                value={value ?? ""}
                onChange={onChange}
                required={required}
            />
        </div>
    );
}

function ChampSelect({ label, name, value, onChange, options = [] }) {
    return (
        <div className="form-group">
            <label>{label}</label>
            <select name={name} value={value ?? ""} onChange={onChange}>
                <option value="">Sélectionner</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

function ChampTextarea({ label, name, value, onChange }) {
    return (
        <div className="form-group full">
            <label>{label}</label>
            <textarea
                name={name}
                value={value ?? ""}
                onChange={onChange}
                rows="3"
            />
        </div>
    );
}