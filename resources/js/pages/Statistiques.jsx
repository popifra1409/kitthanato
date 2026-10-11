import { useEffect, useState } from "react";
import "./Statistiques.css";
import api from "../services/api";

/* ============================================================
   FORMATAGE
============================================================ */

const formatMontant = (n) =>
    Number(n || 0).toLocaleString("fr-FR") + " FCFA";

const formatNombre = (n) =>
    Number(n || 0).toLocaleString("fr-FR");

/* ============================================================
   LIBELLÉS DE PÉRIODE
============================================================ */

const LIBELLES_PERIODE = {
    jour: "Aujourd'hui",
    semaine: "Cette semaine",
    mois: "Ce mois",
    annee: "Cette année",
};

/* ============================================================
   OUTILS
============================================================ */

const pourcentageValeur = (valeur, total) => {
    if (!total || Number(total) === 0) {
        return "0.0";
    }

    return ((Number(valeur || 0) / Number(total)) * 100).toFixed(1);
};

/* ============================================================
   COMPOSANT
============================================================ */

function Statistiques() {
    const [periode, setPeriode] = useState("mois");

    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /* ========================================================
       CHARGEMENT
    ======================================================== */

    const chargerStats = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await api.statistiques.get({ periode, date });

            setStats(data);

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        chargerStats();
    }, [periode, date]);

    /* ========================================================
       CALCUL
    ======================================================== */

    const totalDepots =
        stats?.compteurs?.depots || 0;

    const pourcentage = (n) =>
        pourcentageValeur(n, totalDepots);

    /* ========================================================
       AFFICHAGE
    ======================================================== */

    return (
        <div className="stats-page">

            {/* HEADER */}
            <header className="stats-header">
                <div>
                    <div className="stats-title-block">
                        <h1>Statistiques</h1>
                    </div>
                </div>

                <div className="stats-header-right">
                    <div className="stats-period">
                        <span>PÉRIODE</span>
                        <select
                            value={periode}
                            onChange={(e) => setPeriode(e.target.value)}
                        >
                            <option value="jour">Aujourd'hui</option>
                            <option value="semaine">Cette semaine</option>
                            <option value="mois">Ce mois</option>
                            <option value="annee">Cette année</option>
                        </select>
                    </div>

                    <div className="stats-period">
                        <span>DATE DE RÉFÉRENCE</span>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* CHARGEMENT */}
            {loading && (
                <div className="stats-loading">
                    Chargement des statistiques...
                </div>
            )}

            {error && !loading && (
                <div className="stats-error">{error}</div>
            )}

            {!loading && stats && (
                <>
                    <div className="stats-period-label">
                        <span>PÉRIODE ANALYSÉE</span>
                        <strong>{stats.periode.libelle}</strong>
                    </div>

                    {/* 01 - INDICATEURS */}
                    <section className="stats-section">
                        <div className="stats-section-heading">
                            <div>
                                <span>01</span>
                                <div>
                                    <h2>Indicateurs généraux</h2>
                                </div>
                            </div>
                        </div>

                        <div className="stats-kpis">
                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>DÉPÔTS</span>
                                    <b>01</b>
                                </div>
                                <strong>
                                    {formatNombre(stats.compteurs.depots)}
                                </strong>
                                <small>Nombre de dépôts enregistrés</small>
                            </div>

                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>SORTIES</span>
                                    <b>02</b>
                                </div>
                                <strong>
                                    {formatNombre(stats.compteurs.sorties)}
                                </strong>
                                <small>Sorties effectuées</small>
                            </div>

                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>TRANSFERTS</span>
                                    <b>03</b>
                                </div>
                                <strong>
                                    {formatNombre(stats.compteurs.transferts)}
                                </strong>
                                <small>
                                    {stats.compteurs.transferts_interne} internes ·{" "}
                                    {stats.compteurs.transferts_externe} externes
                                </small>
                            </div>

                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>CONSERVATION</span>
                                    <b>04</b>
                                </div>
                                <strong>
                                    {stats.conservation.duree_moyenne_jours} j
                                </strong>
                                <small>Durée moyenne entre arrivée et sortie</small>
                            </div>
                        </div>
                    </section>

                    {/* 02 - PROVENANCE */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>02</span>
                                <h2>Répartition par provenance</h2>
                            </div>
                        </div>

                        <div className="horizontal-chart">
                            {stats.par_provenance.length === 0 && (
                                <div className="empty-chart">Aucune donnée</div>
                            )}

                            {stats.par_provenance.map((row) => (
                                <div
                                    className="horizontal-row"
                                    key={row.provenance || "n/a"}
                                >
                                    <div className="horizontal-label">
                                        <span>{row.provenance || "Non précisé"}</span>
                                        <strong>
                                            {row.total} ({pourcentage(row.total)}%)
                                        </strong>
                                    </div>
                                    <div className="horizontal-bar">
                                        <div
                                            style={{
                                                width: `${pourcentage(row.total)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ==================================================
                        10 - RÉPARTITION PAR SERVICE D'ORIGINE
                       ================================================== */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>10</span>
                                <h2>Répartition par service d'origine</h2>
                            </div>
                        </div>

                        <div className="horizontal-chart">
                            {!stats.par_service ||
                            stats.par_service.length === 0 ? (
                                <div className="empty-chart">
                                    Aucune donnée
                                </div>
                            ) : (
                                stats.par_service.map((row) => (
                                    <div
                                        className="horizontal-row"
                                        key={row.service_origine || "n/a"}
                                    >
                                        <div className="horizontal-label">
                                            <span>
                                                {row.service_origine ||
                                                    "Non précisé"}
                                            </span>
                                            <strong>
                                                {row.total} (
                                                {pourcentage(row.total)}%)
                                            </strong>
                                        </div>
                                        <div className="horizontal-bar">
                                            <div
                                                style={{
                                                    width: `${pourcentage(
                                                        row.total
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* 03 - MOTIFS */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>03</span>
                                <h2>Répartition par motif</h2>
                            </div>
                        </div>

                        <div className="horizontal-chart">
                            {stats.par_motif.length === 0 && (
                                <div className="empty-chart">Aucune donnée</div>
                            )}

                            {stats.par_motif.map((row) => (
                                <div
                                    className="horizontal-row"
                                    key={row.motif || "n/a"}
                                >
                                    <div className="horizontal-label">
                                        <span>{row.motif || "Non précisé"}</span>
                                        <strong>
                                            {row.total} ({pourcentage(row.total)}%)
                                        </strong>
                                    </div>
                                    <div className="horizontal-bar">
                                        <div
                                            style={{
                                                width: `${pourcentage(row.total)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 04 - TRANSFERTS */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>04</span>
                                <h2>Analyse des transferts</h2>
                            </div>
                        </div>

                        <div className="transfert-analysis">
                            <div className="transfert-total">
                                <span>TOTAL TRANSFERTS</span>
                                <strong>
                                    {formatNombre(stats.compteurs.transferts)}
                                </strong>
                            </div>

                            <div className="transfert-detail">
                                <div>
                                    <span className="distribution-dot interne" />
                                    <span>Internes</span>
                                    <strong>
                                        {formatNombre(
                                            stats.compteurs.transferts_interne
                                        )}
                                    </strong>
                                    <small>
                                        {pourcentageValeur(
                                            stats.compteurs.transferts_interne,
                                            stats.compteurs.transferts
                                        )}
                                        %
                                    </small>
                                </div>

                                <div>
                                    <span className="distribution-dot externe" />
                                    <span>Externes</span>
                                    <strong>
                                        {formatNombre(
                                            stats.compteurs.transferts_externe
                                        )}
                                    </strong>
                                    <small>
                                        {pourcentageValeur(
                                            stats.compteurs.transferts_externe,
                                            stats.compteurs.transferts
                                        )}
                                        %
                                    </small>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 05 - SEXE */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>05</span>
                                <h2>Répartition par sexe</h2>
                            </div>
                        </div>

                        <div className="horizontal-chart">
                            {stats.par_sexe.length === 0 && (
                                <div className="empty-chart">Aucune donnée</div>
                            )}

                            {stats.par_sexe.map((row) => (
                                <div
                                    className="horizontal-row"
                                    key={row.sexe || "n/a"}
                                >
                                    <div className="horizontal-label">
                                        <span>{row.sexe || "Non précisé"}</span>
                                        <strong>
                                            {row.total} ({pourcentage(row.total)}%)
                                        </strong>
                                    </div>
                                    <div className="horizontal-bar">
                                        <div
                                            style={{
                                                width: `${pourcentage(row.total)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 06 - CONSERVATION */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>06</span>
                                <h2>Durée de conservation</h2>
                            </div>
                        </div>

                        <div className="conservation-card">
                            <strong>
                                {stats.conservation.duree_moyenne_jours} jours
                            </strong>
                            <span>
                                Durée moyenne entre l'arrivée et la sortie.
                            </span>
                        </div>
                    </section>

                    {/* 07 - CHAPELLES */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>07</span>
                                <h2>Répartition par chapelle</h2>
                            </div>
                        </div>

                        <div className="simple-stat-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Chapelle</th>
                                        <th>Nombre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.par_chapelle.map((row) => (
                                        <tr key={row.chapelle || "n/a"}>
                                            <td>{row.chapelle || "Non précisé"}</td>
                                            <td>{formatNombre(row.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 08 - EMPLACEMENTS */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>08</span>
                                <h2>Les emplacements les plus utilisés</h2>
                            </div>
                        </div>

                        <div className="horizontal-chart">
                            {stats.top_emplacements.map((row) => (
                                <div
                                    className="horizontal-row"
                                    key={row.emplacement || "n/a"}
                                >
                                    <div className="horizontal-label">
                                        <span>
                                            {row.emplacement || "Non précisé"}
                                        </span>
                                        <strong>{row.total}</strong>
                                    </div>
                                    <div className="horizontal-bar">
                                        <div
                                            style={{
                                                width: `${pourcentage(
                                                    row.total
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 09 - FINANCES */}
                    <section className="stats-panel finance-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>09</span>
                                <h2>Synthèse financière</h2>
                            </div>
                        </div>

                        <div className="finance-list">
                            <div className="finance-row">
                                <span>Prestations</span>
                                <strong>
                                    {formatMontant(
                                        stats.finance.total_prestations
                                    )}
                                </strong>
                            </div>

                            <div className="finance-row">
                                <span>Nuits de conservation</span>
                                <strong>
                                    {formatMontant(stats.finance.total_nuits)}
                                </strong>
                            </div>

                            <div className="finance-row">
                                <span>Chapelles</span>
                                <strong>
                                    {formatMontant(
                                        stats.finance.total_chapelle
                                    )}
                                </strong>
                            </div>

                            <div className="finance-row finance-total">
                                <span>Total facturé</span>
                                <strong>
                                    {formatMontant(
                                        stats.finance.total_facture
                                    )}
                                </strong>
                            </div>

                            <div className="finance-row finance-paid">
                                <span>Total encaissé</span>
                                <strong>
                                    {formatMontant(stats.finance.total_paye)}
                                </strong>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default Statistiques;