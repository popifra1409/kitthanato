import { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";
import api, { asList } from "../services/api";

function Dashboard() {
    const [depots, setDepots] = useState([]);
    const [sorties, setSorties] = useState([]);
    const [transferts, setTransferts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [historique, setHistorique] = useState([]);

    const chargerDonnees = async () => {
    try {
        setLoading(true);
        setError("");

        const [depotsData, sortiesData, transfertsData] = await Promise.all([
            api.depots.list(),
            api.sorties.list(),
            api.transferts.list(),
        ]);

        const depotsListe = asList(depotsData);
        const sortiesListe = asList(sortiesData);
        const transfertsListe = asList(transfertsData);

        setDepots(depotsListe);
        setSorties(sortiesListe);
        setTransferts(transfertsListe);

        // =========================
        // CONSTRUCTION HISTORIQUE
        // =========================

        const historiqueAdmissions = depotsListe.map((depot) => ({
            id: `admission-${depot.id}`,
            date: depot.created_at || depot.date_arrivee,
            type: "ADMISSION",
            code:
                depot.code ||
                depot.code_defunt ||
                "—",
            defunt:
                `${depot.nom || ""} ${depot.prenom || ""}`.trim() ||
                "Sans nom",
            detail: "Admission du défunt",
            statut: "ENREGISTRÉ",
        }));

        const historiqueTransferts = transfertsListe.map(
            (transfert) => {
                const depot =
                    transfert.depot || {};

                return {
                    id: `transfert-${transfert.id}`,
                    date:
                        transfert.updated_at ||
                        transfert.created_at ||
                        `${transfert.date || ""}T${
                            transfert.heure || "00:00"
                        }`,
                    type: "TRANSFERT",
                    code:
                        depot.code ||
                        depot.code_defunt ||
                        "—",
                    defunt:
                        `${depot.nom || ""} ${
                            depot.prenom || ""
                        }`.trim() || "Sans nom",
                    detail:
                        transfert.type === "interne"
                            ? `Transfert interne vers ${
                                  transfert.emplacement_destination ||
                                  "emplacement non précisé"
                              }`
                            : `Transfert externe vers ${
                                  transfert.destination ||
                                  "destination non précisée"
                              }`,
                    statut:
                        transfert.statut ||
                        "EN ATTENTE",
                };
            }
        );

        const historiqueSorties = sortiesListe.map((sortie) => {
            const depot = sortie.depot || {};

            return {
                id: `sortie-${sortie.id}`,
                date:
                    sortie.updated_at ||
                    sortie.created_at ||
                    `${sortie.date || ""}T${
                        sortie.heure || "00:00"
                    }`,
                type: "SORTIE",
                code:
                    depot.code ||
                    depot.code_defunt ||
                    sortie.code ||
                    "—",
                defunt:
                    `${depot.nom || ""} ${
                        depot.prenom || ""
                    }`.trim() || "Sans nom",
                detail: `Sortie récupérée par ${
                    sortie.recuperateur || "récupérateur non précisé"
                }`,
                statut:
                    sortie.statut ||
                    "SORTI",
            };
        });

        const historiqueComplet = [
            ...historiqueAdmissions,
            ...historiqueTransferts,
            ...historiqueSorties,
        ]
            .sort((a, b) => {
                return (
                    new Date(b.date || 0) -
                    new Date(a.date || 0)
                );
            })
            .slice(0, 10);

        setHistorique(historiqueComplet);
    } catch (err) {
        console.error("Erreur Dashboard :", err);

        setError(
            err.message ||
                "Une erreur est survenue lors du chargement du tableau de bord."
        );
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        chargerDonnees();
    }, []);

    const normaliserStatut = (valeur) => {
        return String(valeur || "")
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    const depotsPresents = useMemo(() => {
        return depots.filter((depot) => {
            const statut = normaliserStatut(
                depot.statut || depot.statut_actuel
            );

            return statut === "PRESENT" || statut === "ENCORE PRESENT";
        });
    }, [depots]);

    const nombrePresents = depotsPresents.length;

    const nombreSorties = useMemo(() => {
        return depots.filter((depot) => {
            const statut = normaliserStatut(depot.statut);

            return (
                statut === "SORTI" ||
                statut === "SORTIE"
            );
        }).length;
    }, [depots]);

    const nombreTransferts = transferts.length;

    const nombreAdmissions = depots.length;

    const placesOccupees = useMemo(() => {
        return depotsPresents.filter(
            (depot) => depot.emplacement
        ).length;
    }, [depotsPresents]);

    const emplacements = useMemo(() => {
        const compteur = {};

        depotsPresents.forEach((depot) => {
            const emplacement =
                depot.emplacement || "Non affecté";

            compteur[emplacement] =
                (compteur[emplacement] || 0) + 1;
        });

        return Object.entries(compteur)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [depotsPresents]);

    const dernieresAdmissions = useMemo(() => {
        return [...depots]
            .sort((a, b) => {
                return (
                    new Date(b.created_at || 0) -
                    new Date(a.created_at || 0)
                );
            })
            .slice(0, 5);
    }, [depots]);

    const dernieresSorties = useMemo(() => {
        return [...sorties]
            .sort((a, b) => {
                const dateA = new Date(
                    `${a.date || "1900-01-01"}T${a.heure || "00:00"}`
                );

                const dateB = new Date(
                    `${b.date || "1900-01-01"}T${b.heure || "00:00"}`
                );

                return dateB - dateA;
            })
            .slice(0, 5);
    }, [sorties]);

    const flux = [
        {
            label: "Admissions",
            value: nombreAdmissions,
            className: "flux-admission",
        },
        {
            label: "Présents",
            value: nombrePresents,
            className: "flux-present",
        },
        {
            label: "Transferts",
            value: nombreTransferts,
            className: "flux-transfert",
        },
        {
            label: "Sorties",
            value: nombreSorties,
            className: "flux-sortie",
        },
    ];

    const getNomDefunt = (depot) => {
        if (!depot) return "—";

        return `${depot.nom || ""} ${depot.prenom || ""}`.trim() || "Sans nom";
    };

    const formaterDate = (date) => {
        if (!date) return "—";

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return date;
        }

        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Chargement du tableau de bord...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">

            {/* EN-TÊTE */}
            <div className="dashboard-header">
                <div>
                    <h1>Tableau de bord</h1>

                </div>

                <button
                    className="refresh-button"
                    onClick={chargerDonnees}
                >
                    ↻ Actualiser
                </button>
            </div>

            {/* ERREUR */}
            {error && (
                <div className="dashboard-error">
                    <strong>Erreur :</strong> {error}
                    <button onClick={chargerDonnees}>
                        Réessayer
                    </button>
                </div>
            )}

            {/* CARTES PRINCIPALES */}
            <div className="dashboard-cards">

                <div className="dashboard-card card-purple">
                    <div className="card-icon">♙</div>

                    <div className="card-content">
                        <span>Défunts présents</span>
                        <strong>{nombrePresents}</strong>
                        <small>Actuellement en conservation</small>
                    </div>
                </div>

                <div className="dashboard-card card-blue">
                    <div className="card-icon">↥</div>

                    <div className="card-content">
                        <span>Admissions</span>
                        <strong>{nombreAdmissions}</strong>
                        <small>Total des dossiers enregistrés</small>
                    </div>
                </div>

                <div className="dashboard-card card-green">
                    <div className="card-icon">✓</div>

                    <div className="card-content">
                        <span>Sorties</span>
                        <strong>{nombreSorties}</strong>
                        <small>Défunts sortis</small>
                    </div>
                </div>

                <div className="dashboard-card card-orange">
                    <div className="card-icon">⇄</div>

                    <div className="card-content">
                        <span>Transferts</span>
                        <strong>{nombreTransferts}</strong>
                        <small>Transferts enregistrés</small>
                    </div>
                </div>

            </div>

            {/* FLUX + PLACES */}
            <div className="dashboard-grid">

                <section className="dashboard-panel">

                    <div className="panel-header">
                        <div>
                            <h2>Flux des dossiers</h2>
                            <p>Situation actuelle</p>
                        </div>
                    </div>

                    <div className="flux-list">

                        {flux.map((item) => (
                            <div
                                className="flux-item"
                                key={item.label}
                            >
                                <div className="flux-label">
                                    <span
                                        className={`flux-dot ${item.className}`}
                                    ></span>

                                    <span>{item.label}</span>
                                </div>

                                <strong>{item.value}</strong>
                            </div>
                        ))}

                    </div>

                </section>

                <section className="dashboard-panel">

                    <div className="panel-header">
                        <div>
                            <h2>Occupation</h2>
                            <p>Emplacements actuellement occupés</p>
                        </div>
                    </div>

                    <div className="occupation-number">
                        <strong>{placesOccupees}</strong>
                        <span>emplacements occupés</span>
                    </div>

                    <div className="occupation-list">

                        {emplacements.length === 0 ? (
                            <div className="empty-state">
                                Aucun emplacement occupé.
                            </div>
                        ) : (
                            emplacements.map(
                                ([nom, nombre]) => (
                                    <div
                                        className="occupation-row"
                                        key={nom}
                                    >
                                        <div className="occupation-name">
                                            <span>{nom}</span>
                                            <strong>{nombre}</strong>
                                        </div>

                                        <div className="progress">
                                            <div
                                                className="progress-bar"
                                                style={{
                                                    width: `${Math.min(
                                                        nombre * 20,
                                                        100
                                                    )}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            )
                        )}

                    </div>

                </section>

            </div>

            {/* DERNIÈRES ADMISSIONS + SORTIES */}
            <div className="dashboard-grid">

                <section className="dashboard-panel">

                    <div className="panel-header">
                        <div>
                            <h2>Dernières admissions</h2>
                            <p>Les derniers dossiers enregistrés</p>
                        </div>

                        <span className="panel-count">
                            {depots.length}
                        </span>
                    </div>

                    <div className="table-container">

                        {dernieresAdmissions.length === 0 ? (
                            <div className="empty-state">
                                Aucune admission.
                            </div>
                        ) : (
                            <table className="dashboard-table">

                                <thead>
                                    <tr>
                                        <th>CODE</th>
                                        <th>DÉFUNT</th>
                                        <th>DATE</th>
                                        <th>STATUT</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {dernieresAdmissions.map(
                                        (depot) => (
                                            <tr key={depot.id}>

                                                <td>
                                                    <span className="code-badge">
                                                        {depot.code ||
                                                            depot.code_defunt ||
                                                            "—"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <strong>
                                                        {getNomDefunt(
                                                            depot
                                                        )}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {formaterDate(
                                                        depot.date_arrivee ||
                                                            depot.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            normaliserStatut(
                                                                depot.statut
                                                            ).includes(
                                                                "SORTI"
                                                            )
                                                                ? "status-badge status-sorti"
                                                                : "status-badge status-present"
                                                        }
                                                    >
                                                        {depot.statut ||
                                                            "—"}
                                                    </span>
                                                </td>

                                            </tr>
                                        )
                                    )}
                                </tbody>

                            </table>
                        )}

                    </div>

                </section>

                <section className="dashboard-panel">

                    <div className="panel-header">
                        <div>
                            <h2>Dernières sorties</h2>
                            <p>Les sorties les plus récentes</p>
                        </div>

                        <span className="panel-count">
                            {sorties.length}
                        </span>
                    </div>

                    <div className="table-container">

                        {dernieresSorties.length === 0 ? (
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
                                        <th>STATUT</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {dernieresSorties.map(
                                        (sortie) => {

                                            const depot =
                                                sortie.depot;

                                            return (
                                                <tr key={sortie.id}>

                                                    <td>
                                                        {formaterDate(
                                                            sortie.date
                                                        )}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {getNomDefunt(
                                                                depot
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {sortie.recuperateur ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        <span className="status-badge status-sortie">
                                                            {sortie.statut ||
                                                                "SORTI"}
                                                        </span>
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>

                            </table>
                        )}

                    </div>

                </section>

            </div>

            {/* INFORMATIONS RAPIDES */}
            <section className="quick-actions">

                <div className="quick-action-header">
                    <div>
                        <h2>Actions rapides</h2>
                    </div>
                </div>

                <div className="quick-action-grid">

                    <button
                        onClick={() =>
                            window.location.href = "/depots"
                        }
                    >
                        <span>+</span>
                        <div>
                            <strong>Nouvelle admission</strong>
                            <small>Enregistrer un défunt</small>
                        </div>
                    </button>

                    <button
                        onClick={() =>
                            window.location.href = "/transferts"
                        }
                    >
                        <span>⇄</span>
                        <div>
                            <strong>Nouveau transfert</strong>
                            <small>Transférer un défunt</small>
                        </div>
                    </button>

                    <button
                        onClick={() =>
                            window.location.href = "/sorties"
                        }
                    >
                        <span>✓</span>
                        <div>
                            <strong>Nouvelle sortie</strong>
                            <small>Enregistrer une sortie</small>
                        </div>
                    </button>

                    <button
                        onClick={() =>
                            window.location.href = "/statistiques"
                        }
                    >
                        <span>▥</span>
                        <div>
                            <strong>Statistiques</strong>
                            <small>Consulter les rapports</small>
                        </div>
                    </button>

                </div>


            </section>

        </div>
    );
}

export default Dashboard;