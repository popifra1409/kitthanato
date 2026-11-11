import { useEffect, useState } from "react";
import {
    construireRapport,
    imprimerRapport,
    exporterExcel,
} from "../services/exportStats";
import "./Statistiques.css";
import api from "../services/api";

/* ============================================================
   FORMATAGE
============================================================ */

const formatMontant = (n) =>
    Number(n || 0).toLocaleString("fr-FR") + " FCFA";

const formatNombre = (n) => Number(n || 0).toLocaleString("fr-FR");

/* ============================================================
   OUTILS
============================================================ */

const pourcentageValeur = (valeur, total) => {
    if (!total || Number(total) === 0) return "0.0";
    return ((Number(valeur || 0) / Number(total)) * 100).toFixed(1);
};

/* ============================================================
   BOUTONS D'EXPORT
============================================================ */

function ActionsStat({ stats, cle }) {
    const lancerExcel = async () => {
        try {
            await exporterExcel(construireRapport(cle, stats));
        } catch (e) {
            console.error(e);
            alert(
                "Export Excel impossible. Vérifiez que le paquet « xlsx » est installé."
            );
        }
    };

    return (
        <div className="stat-actions">
            <button
                type="button"
                title="Imprimer ou enregistrer en PDF"
                onClick={() => imprimerRapport(construireRapport(cle, stats))}
            >
                🖨 Imprimer / PDF
            </button>
            <button
                type="button"
                title="Exporter en Excel"
                onClick={lancerExcel}
            >
                📊 Excel
            </button>
        </div>
    );
}

/* ============================================================
   TABLEAU DE RÉPARTITION
   Colonnes : rang · libellé · nombre · part · barre
============================================================ */

function TableauRepartition({
    lignes = [],
    cleLibelle,
    entete,
    totalReference,
    rang = true,
}) {
    const source = (lignes || [])
        .map((ligne) => ({
            libelle: ligne[cleLibelle] || "Non précisé",
            total: Number(ligne.total || 0),
        }))
        .filter((ligne) => ligne.total > 0)
        .sort((a, b) => b.total - a.total);

    if (source.length === 0) {
        return <div className="stats-empty">Aucune donnée sur cette période.</div>;
    }

    const somme = source.reduce((total, ligne) => total + ligne.total, 0);
    const maximum = Math.max(...source.map((ligne) => ligne.total));
    const reference = Number(totalReference || somme);

    return (
        <div className="stats-table-wrap">
            <table className="stats-table">
                <thead>
                    <tr>
                        {rang && <th className="stats-rang">#</th>}
                        <th>{entete}</th>
                        <th className="stats-num">Nombre</th>
                        <th className="stats-num">Part</th>
                        <th className="stats-barre-col">Répartition</th>
                    </tr>
                </thead>

                <tbody>
                    {source.map((ligne, index) => {
                        const part = pourcentageValeur(ligne.total, reference);
                        const largeur = maximum
                            ? Math.max((ligne.total / maximum) * 100, 3)
                            : 0;

                        return (
                            <tr key={`${ligne.libelle}-${index}`}>
                                {rang && (
                                    <td className="stats-rang">{index + 1}</td>
                                )}
                                <td className="stats-libelle">{ligne.libelle}</td>
                                <td className="stats-num">
                                    {formatNombre(ligne.total)}
                                </td>
                                <td className="stats-num stats-part">
                                    {part} %
                                </td>
                                <td className="stats-barre-col">
                                    <span className="stats-barre">
                                        <span
                                            className="stats-barre-remplissage"
                                            style={{ width: `${largeur}%` }}
                                        />
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>

                <tfoot>
                    <tr>
                        <td colSpan={rang ? 2 : 1}>Total</td>
                        <td className="stats-num">{formatNombre(somme)}</td>
                        <td className="stats-num stats-part">
                            {pourcentageValeur(somme, reference)} %
                        </td>
                        <td className="stats-barre-col" />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

/* ============================================================
   TABLEAU SIMPLE (libellé / nombre / part)
============================================================ */

function TableauSimple({ lignes = [], entete, totalReference }) {
    const somme = lignes.reduce(
        (total, ligne) => total + Number(ligne.total || 0),
        0
    );

    if (lignes.length === 0) {
        return <div className="stats-empty">Aucune donnée sur cette période.</div>;
    }

    return (
        <div className="stats-table-wrap">
            <table className="stats-table stats-table-compact">
                <thead>
                    <tr>
                        <th>{entete}</th>
                        <th className="stats-num">Nombre</th>
                        <th className="stats-num">Part</th>
                    </tr>
                </thead>
                <tbody>
                    {lignes.map((ligne) => (
                        <tr key={ligne.libelle}>
                            <td className="stats-libelle">{ligne.libelle}</td>
                            <td className="stats-num">
                                {formatNombre(ligne.total)}
                            </td>
                            <td className="stats-num stats-part">
                                {pourcentageValeur(
                                    ligne.total,
                                    totalReference
                                )}{" "}
                                %
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td>Total</td>
                        <td className="stats-num">{formatNombre(somme)}</td>
                        <td className="stats-num stats-part">
                            {pourcentageValeur(somme, totalReference)} %
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

/* ============================================================
   COMPOSANT
============================================================ */

function Statistiques() {
    const [periode, setPeriode] = useState("mois");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periode, date]);

    /* ========================================================
       CALCULS
    ======================================================== */

    const totalDepots = stats?.compteurs?.depots || 0;
    const totalSorties = stats?.compteurs?.sorties || 0;
    const totalTransferts = stats?.compteurs?.transferts || 0;
    const delais = stats?.transferts_delai || {};
    const sommeDelais =
        Number(delais.moins_24h || 0) +
        Number(delais.plus_24h || 0) +
        Number(delais.non_calcules || 0);
    const tauxSortie = pourcentageValeur(totalSorties, totalDepots);
    const tauxEncaissement = pourcentageValeur(
        stats?.finance?.total_paye,
        stats?.finance?.total_facture
    );

    const lignesTransferts = [
        {
            libelle: "Transferts internes",
            total: Number(stats?.compteurs?.transferts_interne || 0),
        },
        {
            libelle: "Transferts externes",
            total: Number(stats?.compteurs?.transferts_externe || 0),
        },
    ].filter((ligne) => ligne.total > 0);

    const lignesDelais = [
        { libelle: "Moins de 24 heures", total: Number(delais.moins_24h || 0) },
        { libelle: "24 heures et plus", total: Number(delais.plus_24h || 0) },
        {
            libelle: "Non classés (arrivée incomplète)",
            total: Number(delais.non_calcules || 0),
        },
    ].filter((ligne) => ligne.total > 0);

    /* ========================================================
       AFFICHAGE
    ======================================================== */

    return (
        <div className="stats-page">
            {/* HEADER */}
            <header className="stats-header">
                <div className="stats-title-block">
                    <span className="stats-kicker">
                        SERVICE DE THANATOPRAXIE
                    </span>
                    <h1>Statistiques</h1>
                    <p>Activité, répartitions et synthèse financière.</p>
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

            {/* CHARGEMENT / ERREUR */}
            {loading && (
                <div className="stats-loading">
                    Chargement des statistiques...
                </div>
            )}

            {error && !loading && <div className="stats-error">{error}</div>}

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
                                <h2>Indicateurs généraux</h2>
                            </div>
                            <ActionsStat stats={stats} cle="indicateurs" />
                        </div>

                        <div className="stats-kpis">
                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>DÉPÔTS</span>
                                    <b>01</b>
                                </div>
                                <strong>{formatNombre(totalDepots)}</strong>
                                <small>Dossiers enregistrés sur la période</small>
                            </div>

                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>SORTIES</span>
                                    <b>02</b>
                                </div>
                                <strong>{formatNombre(totalSorties)}</strong>
                                <small>
                                    {tauxSortie} % des dépôts de la période
                                </small>
                            </div>

                            <div className="stat-card">
                                <div className="stat-card-top">
                                    <span>TRANSFERTS</span>
                                    <b>03</b>
                                </div>
                                <strong>{formatNombre(totalTransferts)}</strong>
                                <small>
                                    {formatNombre(
                                        stats.compteurs.transferts_interne
                                    )}{" "}
                                    internes ·{" "}
                                    {formatNombre(
                                        stats.compteurs.transferts_externe
                                    )}{" "}
                                    externes
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
                                <small>
                                    Durée moyenne entre arrivée et sortie
                                </small>
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
                            <ActionsStat stats={stats} cle="provenance" />
                        </div>

                        <TableauRepartition
                            lignes={stats.par_provenance}
                            cleLibelle="provenance"
                            entete="Provenance"
                            totalReference={totalDepots}
                        />
                    </section>

                    {/* 10 - SERVICE D'ORIGINE */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>10</span>
                                <h2>Répartition par service d'origine</h2>
                            </div>
                            <ActionsStat stats={stats} cle="service" />
                        </div>

                        <TableauRepartition
                            lignes={stats.par_service}
                            cleLibelle="service_origine"
                            entete="Service d'origine"
                            totalReference={totalDepots}
                        />
                    </section>

                    {/* 03 - MOTIFS */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>03</span>
                                <h2>Répartition par motif</h2>
                            </div>
                            <ActionsStat stats={stats} cle="motif" />
                        </div>

                        <TableauRepartition
                            lignes={stats.par_motif}
                            cleLibelle="motif"
                            entete="Motif"
                            totalReference={totalDepots}
                        />
                    </section>

                    {/* 04 - TRANSFERTS */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>04</span>
                                <h2>Analyse des transferts</h2>
                            </div>
                            <ActionsStat stats={stats} cle="transferts" />
                        </div>

                        <div className="stats-figures">
                            <div className="stats-figure">
                                <span>TOTAL TRANSFERTS</span>
                                <strong>{formatNombre(totalTransferts)}</strong>
                            </div>
                            <div className="stats-figure">
                                <span>DÉLAI MOYEN DÉPÔT → TRANSFERT</span>
                                <strong>
                                    {delais.moyenne_heures || 0} h
                                </strong>
                            </div>
                        </div>

                        <div className="stats-table-grid">
                            <div>
                                <h3 className="stats-subtitle">
                                    Par type de transfert
                                </h3>
                                <TableauSimple
                                    lignes={lignesTransferts}
                                    entete="Type"
                                    totalReference={totalTransferts}
                                />
                            </div>

                            <div>
                                <h3 className="stats-subtitle">
                                    Par délai avant transfert
                                </h3>
                                <TableauSimple
                                    lignes={lignesDelais}
                                    entete="Délai"
                                    totalReference={sommeDelais}
                                />
                            </div>
                        </div>

                        {Number(delais.non_calcules || 0) > 0 && (
                            <p className="stats-note">
                                {delais.non_calcules} transfert(s) non
                                classé(s) : date ou heure d'arrivée du dépôt
                                manquante.
                            </p>
                        )}
                    </section>

                    {/* 05 - SEXE */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>05</span>
                                <h2>Répartition par sexe</h2>
                            </div>
                            <ActionsStat stats={stats} cle="sexe" />
                        </div>

                        <TableauRepartition
                            lignes={stats.par_sexe}
                            cleLibelle="sexe"
                            entete="Sexe"
                            totalReference={totalDepots}
                        />
                    </section>

                    {/* 06 - CONSERVATION */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>06</span>
                                <h2>Durée de conservation</h2>
                            </div>
                            <ActionsStat stats={stats} cle="conservation" />
                        </div>

                        <div className="stats-figures">
                            <div className="stats-figure">
                                <span>DURÉE MOYENNE</span>
                                <strong>
                                    {stats.conservation.duree_moyenne_jours} j
                                </strong>
                                <small>
                                    Durée moyenne entre l'arrivée et la sortie.
                                </small>
                            </div>
                            <div className="stats-figure">
                                <span>SORTIES FACTURÉES</span>
                                <strong>{formatNombre(totalSorties)}</strong>
                                <small>
                                    Sorties enregistrées sur la période.
                                </small>
                            </div>
                        </div>
                    </section>

                    {/* 07 - CHAPELLES */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>07</span>
                                <h2>Répartition par chapelle</h2>
                            </div>
                            <ActionsStat stats={stats} cle="chapelle" />
                        </div>

                        <TableauRepartition
                            lignes={stats.par_chapelle}
                            cleLibelle="chapelle"
                            entete="Chapelle"
                            totalReference={totalDepots}
                        />
                    </section>

                    {/* 08 - EMPLACEMENTS */}
                    <section className="stats-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>08</span>
                                <h2>Emplacements les plus utilisés</h2>
                            </div>
                            <ActionsStat stats={stats} cle="emplacements" />
                        </div>

                        <TableauRepartition
                            lignes={stats.top_emplacements}
                            cleLibelle="emplacement"
                            entete="Emplacement"
                            totalReference={totalDepots}
                        />
                    </section>

                    {/* 09 - FINANCES */}
                    <section className="stats-panel finance-panel">
                        <div className="stats-panel-header">
                            <div>
                                <span>09</span>
                                <h2>Synthèse financière</h2>
                            </div>
                            <ActionsStat stats={stats} cle="finance" />
                        </div>

                        <div className="stats-table-grid">
                            <div>
                                <h3 className="stats-subtitle">Facturation</h3>

                                <div className="stats-table-wrap">
                                    <table className="stats-table stats-table-compact">
                                        <thead>
                                            <tr>
                                                <th>Rubrique</th>
                                                <th className="stats-num">
                                                    Montant
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="stats-libelle">
                                                    Prestations
                                                </td>
                                                <td className="stats-num">
                                                    {formatMontant(
                                                        stats.finance
                                                            .total_prestations
                                                    )}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="stats-libelle">
                                                    Nuits de conservation
                                                </td>
                                                <td className="stats-num">
                                                    {formatMontant(
                                                        stats.finance
                                                            .total_nuits
                                                    )}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="stats-libelle">
                                                    Chapelles
                                                </td>
                                                <td className="stats-num">
                                                    {formatMontant(
                                                        stats.finance
                                                            .total_chapelle
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td>Total facturé</td>
                                                <td className="stats-num">
                                                    {formatMontant(
                                                        stats.finance
                                                            .total_facture
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h3 className="stats-subtitle">Encaissements</h3>

                                <div className="stats-table-wrap">
                                    <table className="stats-table stats-table-compact">
                                        <thead>
                                            <tr>
                                                <th>Rubrique</th>
                                                <th className="stats-num">
                                                    Montant
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="stats-libelle">
                                                    Total encaissé
                                                </td>
                                                <td className="stats-num stats-positif">
                                                    {formatMontant(
                                                        stats.finance
                                                            .total_paye
                                                    )}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="stats-libelle">
                                                    Reste à encaisser
                                                </td>
                                                <td className="stats-num stats-alerte">
                                                    {formatMontant(
                                                        stats.finance
                                                            .total_restant
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td>Facture moyenne</td>
                                                <td className="stats-num">
                                                    {formatMontant(
                                                        stats.finance
                                                            .moyenne_facture
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="stats-progress">
                                    <div className="stats-progress-label">
                                        <span>Taux d'encaissement</span>
                                        <strong>{tauxEncaissement} %</strong>
                                    </div>
                                    <span className="stats-barre">
                                        <span
                                            className="stats-barre-remplissage"
                                            style={{
                                                width: `${Math.min(
                                                    Number(tauxEncaissement),
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default Statistiques;
