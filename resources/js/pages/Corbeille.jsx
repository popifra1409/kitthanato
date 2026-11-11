import { useEffect, useMemo, useState } from "react";
import "./Corbeille.css";
import Pagination from "../components/Pagination";
import { usePagination } from "../utils/usePagination";

import api, { asList } from "../services/api";

function Corbeille() {
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recherche, setRecherche] = useState("");
    const [typeFiltre, setTypeFiltre] = useState("TOUS");
    const [detailOpen, setDetailOpen] = useState(false);
    const [elementDetail, setElementDetail] = useState(null);

    /* CHARGER LA CORBEILLE */
    const chargerCorbeille = async () => {
        try {
            setLoading(true);

            const data = await api.corbeille.list();
            setElements(asList(data));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        chargerCorbeille();
    }, []);

    /* FILTRES*/
    const elementsFiltres = useMemo(() => {
        const terme = recherche.trim().toLowerCase();

        return elements.filter((el) => {
            const correspondType =
                typeFiltre === "TOUS" || el.element_type === typeFiltre;

            if (!correspondType) return false;

            if (!terme) return true;

            const texte = [
                el.user_name,
                el.element_type,
                el.raison,
                JSON.stringify(el.donnees || {}),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return texte.includes(terme);
        });
    }, [elements, recherche, typeFiltre]);

    const paginationCorbeille = usePagination(elementsFiltres, {
        tailleInitiale: 10,
        resetKey: `${recherche}::${typeFiltre}`,
    });

    /* FORMAT DATE */
    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleString("fr-FR");
    };

    /* NOM DU DÉFUNT DEPUIS LES DONNÉES */
    const getNomDefunt = (el) => {
        const d = el.donnees || {};

        /* Cas SORTIE : donnees.sortie.depot.nom */
        if (d.sortie?.depot) {
            const nom = `${d.sortie.depot.nom || ""} ${
                d.sortie.depot.prenom || ""
            }`.trim();
            return nom || d.sortie.depot.code || "—";
        }

        /* Cas DEPOT : donnees.nom */
        if (d.nom) {
            return `${d.nom || ""} ${d.prenom || ""}`.trim();
        }

        return "—";
    };

    /* TYPE BADGE */
    const getTypeBadge = (type) => {
        const classes = {
            SORTIE: "type-sortie",
            DEPOT: "type-depot",
            TRANSFERT: "type-transfert",
        };

        return classes[type] || "type-default";
    };

    /*  OUVRIR DÉTAIL*/
    const ouvrirDetail = (el) => {
        setElementDetail(el);
        setDetailOpen(true);
    };

    /* AFFICHAGE */
    return (
        <section className="param-section">
            <div className="section-title">
                <div>
                    <h2>🗑 Corbeille</h2>
                </div>
            </div>

            {/* BARRE DE RECHERCHE */}
            <div className="corbeille-toolbar">
                <div className="corbeille-search">
                    <span>⌕</span>
                    <input
                        type="text"
                        placeholder="Rechercher un défunt, un utilisateur..."
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                    />

                    {recherche && (
                        <button
                            type="button"
                            onClick={() => setRecherche("")}
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="corbeille-filter">
                    <label>TYPE</label>
                    <select
                        value={typeFiltre}
                        onChange={(e) => setTypeFiltre(e.target.value)}
                    >
                        <option value="TOUS">TOUS</option>
                        <option value="SORTIE">SORTIES</option>
                        <option value="DEPOT">DÉPÔTS</option>
                        <option value="TRANSFERT">TRANSFERTS</option>
                    </select>
                </div>
            </div>

            {/* CONTENU */}
            {loading ? (
                <div className="parametres-loading">
                    Chargement de la corbeille...
                </div>
            ) : elementsFiltres.length === 0 ? (
                <div className="parametres-empty">
                    Aucun élément supprimé.
                </div>
            ) : (
                <>
                <div className="settings-table-wrapper">
                    <table className="settings-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Élément</th>
                                <th>Supprimé par</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginationCorbeille.items.map((el) => (
                                <tr key={el.id}>
                                    <td>{formatDate(el.created_at)}</td>

                                    <td>
                                        <span
                                            className={`corbeille-type-badge ${getTypeBadge(
                                                el.element_type
                                            )}`}
                                        >
                                            {el.element_type}
                                        </span>
                                    </td>

                                    <td>
                                        <strong>{getNomDefunt(el)}</strong>
                                    </td>

                                    <td>
                                        <strong>
                                            {el.user_name || "Inconnu"}
                                        </strong>
                                        {el.user?.role && (
                                            <span className="user-role-small">
                                                ({el.user.role})
                                            </span>
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className="action-view"
                                            onClick={() => ouvrirDetail(el)}
                                        >
                                            👁 Détails
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={paginationCorbeille.page}
                    pages={paginationCorbeille.pages}
                    total={paginationCorbeille.total}
                    taille={paginationCorbeille.taille}
                    onPage={paginationCorbeille.setPage}
                    onTaille={paginationCorbeille.setTaille}
                    element="élément"
                />
                </>
            )}

            {/* MODALE DÉTAIL */}
            {detailOpen && elementDetail && (
                <div
                    className="modal-overlay"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setDetailOpen(false);
                            setElementDetail(null);
                        }
                    }}
                >
                    <div className="corbeille-detail-modal">
                        <div className="modal-header">
                            <h2>Détails de l'élément supprimé</h2>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => {
                                    setDetailOpen(false);
                                    setElementDetail(null);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="detail-content">
                            <div className="detail-line">
                                <span>Type</span>
                                <strong>{elementDetail.element_type}</strong>
                            </div>

                            <div className="detail-line">
                                <span>Supprimé par</span>
                                <strong>
                                    {elementDetail.user_name || "Inconnu"}
                                </strong>
                            </div>

                            <div className="detail-line">
                                <span>Date de suppression</span>
                                <strong>
                                    {formatDate(elementDetail.created_at)}
                                </strong>
                            </div>

                            <div className="detail-donnees">
                                <span>Données complètes</span>

                                <pre>
                                    {JSON.stringify(
                                        elementDetail.donnees,
                                        null,
                                        2
                                    )}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Corbeille;