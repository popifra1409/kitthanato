import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import api from "../services/api";
import { useSession } from "../services/SessionContext";
import {
    CourbeFlux,
    DonutOccupation,
} from "../components/DashboardCharts";

/* =========================================================
   OUTILS
========================================================= */

const nomDefunt = (item) =>
    `${item?.nom || ""} ${item?.prenom || ""}`.trim() || "Sans nom";

const dateCourte = (valeur) => {
    if (!valeur) return "—";

    const [annee, mois, jour] = String(valeur).substring(0, 10).split("-");

    if (!annee || !mois || !jour) return valeur;

    return `${jour}/${mois}/${annee}`;
};

const formaterMontant = (valeur) =>
    new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 0,
    }).format(Number(valeur || 0));

const formaterVariation = (valeur) => {
    if (!valeur || valeur.variation === null) return null;

    const signe = valeur.variation >= 0 ? "+" : "−";
    const pourcentage = Math.abs(valeur.variation).toLocaleString("fr-FR");

    return `${signe} ${pourcentage} % vs mois dernier`;
};

const classeStatut = (statut) => {
    const normalise = String(statut || "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (normalise === "SORTI") return "status-badge status-sorti";
    if (normalise === "TRANSFERE") return "status-badge status-transfere";

    return "status-badge status-present";
};

/* =========================================================
   COMPOSANT
========================================================= */

function Dashboard() {
    const navigate = useNavigate();
    const { can } = useSession();

    const [donnees, setDonnees] = useState(null);
    const [chargement, setChargement] = useState(true);
    const [actualisation, setActualisation] = useState(false);
    const [erreur, setErreur] = useState("");

    const charger = async ({ silencieux = false } = {}) => {
        if (silencieux) {
            setActualisation(true);
        } else {
            setChargement(true);
        }

        setErreur("");

        try {
            setDonnees(await api.dashboard.get());
        } catch (error) {
            setErreur(
                error?.firstMessage ||
                    error?.message ||
                    "Impossible de charger le tableau de bord."
            );
        } finally {
            setChargement(false);
            setActualisation(false);
        }
    };

    useEffect(() => {
        let annule = false;

        api.dashboard
            .get()
            .then((data) => {
                if (!annule) setDonnees(data);
            })
            .catch((error) => {
                if (annule) return;
                setErreur(
                    error?.firstMessage ||
                        error?.message ||
                        "Impossible de charger le tableau de bord."
                );
            })
            .finally(() => {
                if (!annule) setChargement(false);
            });

        return () => {
            annule = true;
        };
    }, []);

    if (chargement) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Chargement du tableau de bord...</p>
                </div>
            </div>
        );
    }

    if (!donnees) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-header">
                    <div>
                        <h1>Tableau de bord</h1>
                    </div>

                    <button
                        className="refresh-button"
                        onClick={() => charger()}
                    >
                        ↻ Réessayer
                    </button>
                </div>

                <div className="dashboard-error">
                    <strong>Erreur :</strong>{" "}
                    {erreur || "Aucune donnée disponible."}
                </div>
            </div>
        );
    }

    const compteurs = donnees.compteurs || {};
    const tendances = donnees.tendances || {};
    const occupation = donnees.occupation;
    const totauxOccupation = occupation?.totaux;
    const alertes = donnees.alertes || {};
    const impayes = alertes.impayes;
    const nonAttribues = alertes.non_attribues;
    const scelles = alertes.scelles;
    const finance = donnees.finance;
    const admissions = donnees.dernieres_admissions || [];
    const sorties = donnees.dernieres_sorties || [];

    const heureMaj = donnees.genere_le
        ? new Date(donnees.genere_le).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
          })
        : null;

    const dateDuJour = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const tendanceAdmissions = formaterVariation(tendances.admissions);
    const tendanceSorties = formaterVariation(tendances.sorties);

    const actions = [
        {
            permission: "depots.create",
            icone: "+",
            titre: "Nouvelle admission",
            detail: "Enregistrer un défunt",
            lien: "/DepotCorps?nouveau=1",
        },
        {
            permission: "transferts.create",
            icone: "⇄",
            titre: "Nouveau transfert",
            detail: "Transférer un défunt",
            lien: "/transfert?nouveau=1",
        },
        {
            permission: "sorties.create",
            icone: "✓",
            titre: "Nouvelle sortie",
            detail: "Enregistrer une sortie",
            lien: "/Sortie?nouveau=1",
        },
        {
            permission: "declarations.create",
            icone: "▤",
            titre: "Nouvelle déclaration",
            detail: "Déclaration de décès",
            lien: "/declarations?nouveau=1",
        },
        {
            permission: "emplacements.view",
            icone: "▦",
            titre: "Plan d'occupation",
            detail: "Chambres froides et caissons",
            lien: "/Emplacements",
        },
        {
            permission: "statistiques.view",
            icone: "▥",
            titre: "Statistiques",
            detail: "Consulter les rapports",
            lien: "/Statistiques",
        },
    ].filter((action) => can(action.permission));

    const ouvrirDepot = (id) => {
        if (!id) return;
        navigate(`/DepotCorps?depot=${id}`);
    };

    return (
        <div className="dashboard-page">
            {/* EN-TÊTE */}
            <div className="dashboard-header">
                <div>
                    <h1>Tableau de bord</h1>
                    <p>
                        Vue d'ensemble au {dateDuJour}
                        {heureMaj ? ` · actualisé à ${heureMaj}` : ""}
                    </p>
                </div>

                <button
                    className="refresh-button"
                    onClick={() => charger({ silencieux: true })}
                    disabled={actualisation}
                >
                    {actualisation ? "Actualisation…" : "↻ Actualiser"}
                </button>
            </div>

            {/* ERREUR */}
            {erreur && (
                <div className="dashboard-error">
                    <strong>Erreur :</strong> {erreur}
                    <button onClick={() => charger()}>Réessayer</button>
                </div>
            )}

            {/* CARTES PRINCIPALES */}
            <div className="dashboard-cards">
                <div className="dashboard-card card-purple">
                    <div className="card-icon">♙</div>

                    <div className="card-content">
                        <span>Défunts présents</span>
                        <strong>{compteurs.presents ?? 0}</strong>
                        <small>
                            {compteurs.scelles === null ||
                            compteurs.scelles === undefined
                                ? "Actuellement en conservation"
                                : `${compteurs.scelles} scellé(s)`}
                        </small>
                    </div>
                </div>

                <div className="dashboard-card card-blue">
                    <div className="card-icon">↥</div>

                    <div className="card-content">
                        <span>Admissions</span>
                        <strong>{compteurs.admissions ?? 0}</strong>
                        <small>
                            {compteurs.admissions_aujourdhui ?? 0} aujourd'hui
                            {" · "}
                            {compteurs.admissions_mois ?? 0} ce mois
                        </small>
                        {tendanceAdmissions && (
                            <em
                                className={`kpi-tendance ${
                                    (tendances.admissions?.variation ?? 0) >= 0
                                        ? "hausse"
                                        : "baisse"
                                }`}
                            >
                                {tendanceAdmissions}
                            </em>
                        )}
                    </div>
                </div>

                <div className="dashboard-card card-green">
                    <div className="card-icon">✓</div>

                    <div className="card-content">
                        <span>Sorties</span>
                        <strong>{compteurs.sorties ?? 0}</strong>
                        <small>
                            {compteurs.sorties_aujourdhui ?? 0} aujourd'hui
                            {" · "}
                            {compteurs.sorties_mois ?? 0} ce mois
                        </small>
                        {tendanceSorties && (
                            <em
                                className={`kpi-tendance ${
                                    (tendances.sorties?.variation ?? 0) >= 0
                                        ? "hausse"
                                        : "baisse"
                                }`}
                            >
                                {tendanceSorties}
                            </em>
                        )}
                    </div>
                </div>

                <div className="dashboard-card card-orange">
                    <div className="card-icon">⇄</div>

                    <div className="card-content">
                        <span>Transferts</span>
                        <strong>{compteurs.transferts ?? 0}</strong>
                        <small>
                            {compteurs.transferts_mois ?? 0} ce mois
                        </small>
                    </div>
                </div>

                <div className="dashboard-card card-teal">
                    <div className="card-icon">▦</div>

                    <div className="card-content">
                        <span>Occupation</span>
                        <strong>
                            {totauxOccupation
                                ? `${totauxOccupation.taux} %`
                                : "—"}
                        </strong>
                        <small>
                            {totauxOccupation
                                ? `${totauxOccupation.occupes} / ${totauxOccupation.actifs} caissons actifs`
                                : "Permission emplacements requise"}
                        </small>
                    </div>
                </div>

                <div className="dashboard-card card-red">
                    <div className="card-icon">₣</div>

                    <div className="card-content">
                        <span>Reste à recouvrer</span>
                        <strong>
                            {impayes ? formaterMontant(impayes.montant) : "—"}
                        </strong>
                        <small>
                            {impayes
                                ? `${impayes.total} non soldée(s)${
                                      finance
                                          ? ` · ${formaterMontant(
                                                finance.mois.paye
                                            )} encaissé(s) ce mois`
                                          : ""
                                  }`
                                : "Permission sorties requise"}
                        </small>
                    </div>
                </div>
            </div>

            {/* COURBE + OCCUPATION */}
            <div className="dashboard-grid dashboard-grid-large">
                <section className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Flux des 14 derniers jours</h2>
                            <p>Admissions et sorties enregistrées par jour</p>
                        </div>

                        <div className="chart-legende">
                            <span>
                                <i className="chart-puce chart-puce-admission" />
                                Admissions
                            </span>
                            <span>
                                <i className="chart-puce chart-puce-sortie" />
                                Sorties
                            </span>
                        </div>
                    </div>

                    <div className="chart-conteneur">
                        <CourbeFlux points={donnees.serie?.points || []} />
                    </div>
                </section>

                <section className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Occupation</h2>
                            <p>Caissons actifs des chambres froides</p>
                        </div>
                    </div>

                    {occupation ? (
                        <div className="occupation-contenu">
                            <DonutOccupation
                                occupes={totauxOccupation.occupes}
                                actifs={totauxOccupation.actifs}
                                taux={totauxOccupation.taux}
                            />

                            <div className="chambres-liste">
                                {occupation.chambres.length === 0 ? (
                                    <div className="empty-state">
                                        Aucune chambre froide enregistrée.
                                    </div>
                                ) : (
                                    occupation.chambres.map((chambre) => (
                                        <div
                                            className="chambre-row"
                                            key={chambre.id}
                                        >
                                            <div className="chambre-entete">
                                                <span>
                                                    {chambre.nom}
                                                    {!chambre.actif && (
                                                        <em>inactive</em>
                                                    )}
                                                </span>
                                                <small>
                                                    {chambre.caissons_actifs >
                                                    0
                                                        ? `${chambre.occupes}/${chambre.caissons_actifs}`
                                                        : "inactive"}
                                                </small>
                                            </div>

                                            <div className="progress">
                                                <div
                                                    className="progress-bar progress-bar-occupation"
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            chambre.taux
                                                        )}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            Activez la permission « emplacements.view » pour
                            afficher l'occupation des caissons.
                        </div>
                    )}
                </section>
            </div>

            {/* ALERTES + DERNIÈRES ADMISSIONS */}
            <div className="dashboard-grid">
                <section className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Alertes</h2>
                            <p>Points à traiter en priorité</p>
                        </div>
                    </div>

                    <div className="alertes-liste">
                        {nonAttribues && (
                            <div className="alerte alerte-warn">
                                <div className="alerte-entete">
                                    <strong>Corps sans caisson</strong>
                                    <span>{nonAttribues.total}</span>
                                </div>

                                {nonAttribues.corps.length === 0 ? (
                                    <p className="alerte-vide">
                                        Tous les corps présents sont
                                        attribués.
                                    </p>
                                ) : (
                                    nonAttribues.corps.map((corps) => (
                                        <button
                                            type="button"
                                            className="alerte-lien"
                                            key={corps.id}
                                            onClick={() =>
                                                ouvrirDepot(corps.id)
                                            }
                                        >
                                            <span>
                                                {corps.code} ·{" "}
                                                {nomDefunt(corps)}
                                            </span>
                                            <small>
                                                arrivé le{" "}
                                                {dateCourte(
                                                    corps.date_arrivee
                                                )}
                                            </small>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {impayes && (
                            <div className="alerte alerte-danger">
                                <div className="alerte-entete">
                                    <strong>Sorties non soldées</strong>
                                    <span>{impayes.total}</span>
                                </div>

                                {impayes.sorties.length === 0 ? (
                                    <p className="alerte-vide">
                                        Aucun impayé enregistré.
                                    </p>
                                ) : (
                                    impayes.sorties.map((sortie) => (
                                        <button
                                            type="button"
                                            className="alerte-lien"
                                            key={sortie.id}
                                            onClick={() =>
                                                ouvrirDepot(sortie.depot_id)
                                            }
                                        >
                                            <span>
                                                {sortie.code} ·{" "}
                                                {nomDefunt(sortie)}
                                            </span>
                                            <small>
                                                {formaterMontant(
                                                    sortie.reste_a_payer
                                                )}{" "}
                                                à recouvrer
                                            </small>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {scelles && (
                            <div className="alerte alerte-info">
                                <div className="alerte-entete">
                                    <strong>Corps scellés</strong>
                                    <span>{scelles.total}</span>
                                </div>

                                <p className="alerte-vide">
                                    Ces corps ne peuvent plus être déplacés ni
                                    sortis tant qu'ils restent scellés.
                                </p>
                            </div>
                        )}

                        {!nonAttribues && !impayes && !scelles && (
                            <div className="empty-state">
                                Aucune alerte disponible avec vos permissions.
                            </div>
                        )}
                    </div>
                </section>

                <section className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Dernières admissions</h2>
                            <p>Les derniers dossiers enregistrés</p>
                        </div>

                        <span className="panel-count">
                            {compteurs.admissions ?? 0}
                        </span>
                    </div>

                    <div className="table-container">
                        {admissions.length === 0 ? (
                            <div className="empty-state">
                                Aucune admission.
                            </div>
                        ) : (
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>CODE</th>
                                        <th>DÉFUNT</th>
                                        <th>ARRIVÉE</th>
                                        <th>CAISSON</th>
                                        <th>STATUT</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {admissions.map((depot) => (
                                        <tr
                                            key={depot.id}
                                            className="ligne-cliquable"
                                            tabIndex={0}
                                            role="button"
                                            onClick={() =>
                                                ouvrirDepot(depot.id)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    event.preventDefault();
                                                    ouvrirDepot(depot.id);
                                                }
                                            }}
                                        >
                                            <td>
                                                <span className="code-badge">
                                                    {depot.code ||
                                                        depot.code_defunt ||
                                                        "—"}
                                                </span>
                                            </td>

                                            <td>
                                                <strong>
                                                    {nomDefunt(depot)}
                                                </strong>
                                                {depot.scelle && (
                                                    <span className="badge-scelle">
                                                        scellé
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                {dateCourte(
                                                    depot.date_arrivee
                                                )}
                                            </td>

                                            <td>
                                                {depot.caisson
                                                    ? `${depot.caisson}${
                                                          depot.chambre
                                                              ? ` · ${depot.chambre}`
                                                              : ""
                                                      }`
                                                    : "Non attribué"}
                                            </td>

                                            <td>
                                                <span
                                                    className={classeStatut(
                                                        depot.statut
                                                    )}
                                                >
                                                    {depot.statut || "—"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>

            {/* DERNIÈRES SORTIES */}
            <section className="dashboard-panel dashboard-panel-sorties">
                <div className="panel-header">
                    <div>
                        <h2>Dernières sorties</h2>
                        <p>Les sorties les plus récentes</p>
                    </div>

                    <span className="panel-count">
                        {compteurs.sorties ?? 0}
                    </span>
                </div>

                <div className="table-container">
                    {sorties.length === 0 ? (
                        <div className="empty-state">
                            Aucune sortie enregistrée.
                        </div>
                    ) : (
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>DÉFUNT</th>
                                    <th>RÉCUPÉRATEUR</th>
                                    <th>MONTANT</th>
                                    <th>RESTE</th>
                                    <th>STATUT</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sorties.map((sortie) => (
                                    <tr
                                        key={sortie.id}
                                        className="ligne-cliquable"
                                        tabIndex={0}
                                        role="button"
                                        onClick={() =>
                                            ouvrirDepot(sortie.depot_id)
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                ouvrirDepot(sortie.depot_id);
                                            }
                                        }}
                                    >
                                        <td>
                                            {dateCourte(sortie.date)}
                                            {sortie.heure
                                                ? ` · ${sortie.heure}`
                                                : ""}
                                        </td>

                                        <td>
                                            <strong>
                                                {nomDefunt(sortie)}
                                            </strong>
                                        </td>

                                        <td>
                                            {sortie.recuperateur || "—"}
                                        </td>

                                        <td>
                                            {formaterMontant(
                                                sortie.montant_total
                                            )}
                                        </td>

                                        <td>
                                            {sortie.reste_a_payer > 0 ? (
                                                <span className="reste-du">
                                                    {formaterMontant(
                                                        sortie.reste_a_payer
                                                    )}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            <span className="status-badge status-sorti">
                                                {sortie.statut || "SORTI"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* ACTIONS RAPIDES */}
            {actions.length > 0 && (
                <section className="quick-actions">
                    <div className="quick-action-header">
                        <div>
                            <h2>Actions rapides</h2>
                        </div>
                    </div>

                    <div className="quick-action-grid">
                        {actions.map((action) => (
                            <button
                                key={action.titre}
                                type="button"
                                onClick={() => navigate(action.lien)}
                            >
                                <span>{action.icone}</span>
                                <div>
                                    <strong>{action.titre}</strong>
                                    <small>{action.detail}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default Dashboard;
