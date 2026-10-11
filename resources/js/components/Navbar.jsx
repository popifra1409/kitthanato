import "./Navbar.css";
import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSession } from "../services/SessionContext";

function Navbar() {
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showParametresMenu, setShowParametresMenu] = useState(false);

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("darkMode") === "true";
    });

    const { user, can, logout } = useSession();

    const navigate = useNavigate();
    const location = useLocation();

    /* ---------- FERMER LES MENUS AU CLIC EXTÉRIEUR ---------- */
    useEffect(() => {
        const handler = (e) => {
            if (!e.target.closest(".navbar-user")) {
                setShowAdminMenu(false);
            }
            if (!e.target.closest(".navbar-parametres-wrapper")) {
                setShowParametresMenu(false);
            }
        };

        document.addEventListener("click", handler);

        return () => document.removeEventListener("click", handler);
    }, []);

    /* ---------- FERMER LE MENU PARAMÈTRES AU CHANGEMENT DE PAGE ---------- */
    useEffect(() => {
        setShowParametresMenu(false);
    }, [location.pathname]);

    /* ---------- FERMER AVEC ÉCHAP ---------- */
    useEffect(() => {
        const gererEchap = (e) => {
            if (e.key === "Escape") {
                setShowParametresMenu(false);
                setShowAdminMenu(false);
            }
        };

        document.addEventListener("keydown", gererEchap);

        return () => document.removeEventListener("keydown", gererEchap);
    }, []);

    /* ---------- MODE SOMBRE ---------- */
    const toggleDarkMode = () => {
        setDarkMode((prev) => {
            const nouveauMode = !prev;
            document.body.classList.toggle("dark-mode", nouveauMode);
            return nouveauMode;
        });
    };

    /* ---------- DÉCONNEXION ---------- */
    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    /* =====================================================
       RÔLE ET AUTORISATIONS
    ===================================================== */
    const canDashboard = can("dashboard.view");
    const canDepot = can("depots.view");
    const canDeclarations = can("declarations.view");
    const canLevees = can("levees.view");
    const canTransfert = can("transferts.view");
    const canSortie = can("sorties.view");
    const canStatistiques = can("statistiques.view");

    const canHistorique = can("historique.view");
    const canReferentiels = can("referentiels.manage");
    const canUtilisateurs = can("utilisateurs.view");
    const canRoles = can("roles.view");
    const canCorbeille = can("corbeille.view");
    const canParametres =
        canHistorique || canReferentiels || canUtilisateurs || canRoles || canCorbeille;

    return (
        <nav className="navbar">

            {/* LOGO */}
            <div className="navbar-logo">
                <div className="logo-text">
                    <img src="/logo.png" alt="Logo" />
                </div>
            </div>

            {/* MENU */}
            <div className="navbar-links">

                {canDashboard && (
                    <NavLink to="/dashboard" className="nav-link">
                        <span>Tableau de bord</span>
                    </NavLink>
                )}

                {canDeclarations && (
                    <NavLink to="/declarations" className="nav-link">
                        <span>Déclaration</span>
                    </NavLink>
                )}

                {canDepot && (
                    <NavLink to="/DepotCorps" className="nav-link">
                        <span>Dépôt</span>
                    </NavLink>
                )}

                {canTransfert && (
                    <NavLink to="/transfert" className="nav-link">
                        <span>Transfert</span>
                    </NavLink>
                )}

                {canSortie && (
                    <NavLink to="/Sortie" className="nav-link">
                        <span>Sortie</span>
                    </NavLink>
                )}

                {canLevees && (
                    <NavLink to="/PlanningLevees" className="nav-link">
                        <span>Levée</span>
                    </NavLink>
                )}

                {canStatistiques && (
                    <NavLink to="/Statistiques" className="nav-link">
                        <span>Statistiques</span>
                    </NavLink>
                )}

            </div>

            {/* PARTIE DROITE */}
            <div className="navbar-right">

                {/* =====================================================
                    MENU PARAMÈTRES AVEC SOUS-MENU
                ===================================================== */}
                {canParametres && (
                    <div className="navbar-parametres-wrapper">
                        <button
                            type="button"
                            className={`navbar-parametres-btn ${
                                showParametresMenu ? "active" : ""
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowParametresMenu(!showParametresMenu);
                            }}
                            title="Paramètres"
                        >
                            <span className="parametre-icon">⚙️</span>
                        </button>

                        {showParametresMenu && (
                            <div className="parametres-dropdown">
                                <div className="parametres-dropdown-header">
                                    Paramètres
                                </div>

                                {canHistorique && (
                                    <NavLink
                                        to="/Parametres?section=historique"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">📜</span>
                                        <div className="item-content">
                                            <strong>Historique</strong>
                                            <small>Consulter les actions</small>
                                        </div>
                                    </NavLink>
                                )}

                                {canReferentiels && (
                                    <NavLink
                                        to="/Parametres?section=chapelles"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">⛪</span>
                                        <div className="item-content">
                                            <strong>Chapelles</strong>
                                            <small>Gérer les chapelles</small>
                                        </div>
                                    </NavLink>
                                )}

                                {canReferentiels && (
                                    <NavLink
                                        to="/Parametres?section=prestations"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">💼</span>
                                        <div className="item-content">
                                            <strong>Prestations</strong>
                                            <small>Gérer les prestations</small>
                                        </div>
                                    </NavLink>
                                )}

                                {canReferentiels && (
                                    <NavLink
                                        to="/Parametres?section=services"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">🏥</span>
                                        <div className="item-content">
                                            <strong>Services</strong>
                                            <small>Services d'origine</small>
                                        </div>
                                    </NavLink>
                                )}

                                {canUtilisateurs && (
                                    <NavLink
                                        to="/Parametres?section=utilisateurs"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">👥</span>
                                        <div className="item-content">
                                            <strong>Utilisateurs</strong>
                                            <small>Gérer les comptes</small>
                                        </div>
                                    </NavLink>
                                )}

                                {canRoles && (
                                    <NavLink
                                        to="/Parametres?section=roles"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">🔐</span>
                                        <div className="item-content">
                                            <strong>Rôles & permissions</strong>
                                            <small>Définir qui peut faire quoi</small>
                                        </div>
                                    </NavLink>
                                )}

                                {canCorbeille && (
                                    <NavLink
                                        to="/Parametres?section=corbeille"
                                        className="parametres-item"
                                    >
                                        <span className="item-icon">🗑️</span>
                                        <div className="item-content">
                                            <strong>Corbeille</strong>
                                            <small>Éléments supprimés</small>
                                        </div>
                                    </NavLink>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <NavLink
                    to="/notifications"
                    className="notification-button"
                    title="Notifications"
                >
                    <span className="notification-icon">🔔</span>
                </NavLink>

                <div className="navbar-separator"></div>

                <div className="navbar-user">

                    <div className="user-info">
                        <strong>{user?.name || "Utilisateur"}</strong>
                        {user?.role_libelle && <small>{user.role_libelle}</small>}
                    </div>

                    <button
                        type="button"
                        className="user-arrow"
                        onClick={() => setShowAdminMenu(!showAdminMenu)}
                    >
                        {showAdminMenu ? "▲" : "▼"}
                    </button>

                    {showAdminMenu && (
                        <div className="admin-dropdown">
                            <button type="button" onClick={toggleDarkMode}>
                                {darkMode
                                    ? "☀️ Luminosité claire"
                                    : "🌙 Mode sombre"}
                            </button>
                            <button type="button" onClick={handleLogout}>
                                🔒 Déconnexion
                            </button>
                        </div>
                    )}

                </div>

            </div>

        </nav>
    );
}

export default Navbar;