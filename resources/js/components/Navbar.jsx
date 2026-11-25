import "./Navbar.css";
import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSession } from "../services/SessionContext";
import GlobalSearch from "./GlobalSearch";

/* =========================================================
   PETITES ICÔNES (traits fins, couleur = couleur du texte)
========================================================= */

const ICONES = {
    dashboard: (
        <>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </>
    ),
    depot: (
        <>
            <rect x="2" y="3" width="20" height="5" rx="1" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
        </>
    ),
    pin: (
        <>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </>
    ),
    chart: (
        <>
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </>
    ),
    move: (
        <>
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
        </>
    ),
    doc: (
        <>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </>
    ),
    settings: (
        <>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </>
    ),
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
};

function Icon({ name, size = 17 }) {
    return (
        <svg
            className="nav-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {ICONES[name]}
        </svg>
    );
}

function Navbar() {
    const [openMenu, setOpenMenu] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSection, setMobileSection] = useState(null);

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("darkMode") === "true";
    });

    const { user, can, logout } = useSession();

    const navigate = useNavigate();
    const location = useLocation();

    /* ---------- FERMER LES MENUS AU CLIC EXTÉRIEUR ---------- */
    useEffect(() => {
        const fermerAuClic = (e) => {
            if (!e.target.closest(".navbar-dropdown-wrapper")) {
                setOpenMenu(null);
            }
        };

        document.addEventListener("click", fermerAuClic);

        return () => document.removeEventListener("click", fermerAuClic);
    }, []);

    /* ---------- FERMER AVEC ÉCHAP ---------- */
    useEffect(() => {
        const fermerAvecEchap = (e) => {
            if (e.key === "Escape") {
                setOpenMenu(null);
                setMobileOpen(false);
                setMobileSection(null);
            }
        };

        document.addEventListener("keydown", fermerAvecEchap);

        return () => document.removeEventListener("keydown", fermerAvecEchap);
    }, []);

    /* ---------- BLOQUER LE DÉFILEMENT DERRIÈRE LE TIROIR MOBILE ---------- */
    useEffect(() => {
        document.body.classList.toggle("navbar-mobile-ouverte", mobileOpen);

        return () => document.body.classList.remove("navbar-mobile-ouverte");
    }, [mobileOpen]);

    /* ---------- APPLIQUER LE THÈME AU CHARGEMENT ---------- */
    useEffect(() => {
        document.body.classList.toggle("dark-mode", darkMode);
    }, [darkMode]);

    /* ---------- MODE SOMBRE ---------- */
    const toggleDarkMode = () => {
        setDarkMode((prev) => {
            const nouveauMode = !prev;

            document.body.classList.toggle("dark-mode", nouveauMode);
            localStorage.setItem("darkMode", String(nouveauMode));

            return nouveauMode;
        });
    };

    /* ---------- DÉCONNEXION ---------- */
    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    const basculerMenu = (cle) =>
        setOpenMenu((actuel) => (actuel === cle ? null : cle));

    const fermerMobile = () => {
        setMobileOpen(false);
        setMobileSection(null);
    };

    const basculerTiroir = () => {
        if (mobileOpen) {
            setMobileSection(null);
        }

        setMobileOpen(!mobileOpen);
    };

    const estSectionActive = (items) =>
        items.some((item) => location.pathname.startsWith(item.to));

    /* =====================================================
       MENUS PRINCIPAUX
    ===================================================== */
    const canDashboard = can("dashboard.view");
    const canDepot = can("depots.view");
    const canEmplacements = can("emplacements.view");
    const canStatistiques = can("statistiques.view");

    const groupes = [];

    const mouvements = [];
    if (can("transferts.view")) {
        mouvements.push({
            to: "/transfert",
            label: "Transferts",
            description: "Déplacer un corps",
            icon: "🔄",
        });
    }
    if (can("sorties.view")) {
        mouvements.push({
            to: "/Sortie",
            label: "Sorties",
            description: "Rendre un corps à la famille",
            icon: "🚪",
        });
    }
    if (can("levees.view")) {
        mouvements.push({
            to: "/PlanningLevees",
            label: "Levées",
            description: "Planifier les levées",
            icon: "🕊️",
        });
    }
    if (mouvements.length) {
        groupes.push({
            key: "mouvements",
            label: "Mouvements",
            icone: "move",
            items: mouvements,
        });
    }

    const documents = [];
    if (can("declarations.view")) {
        documents.push({
            to: "/declarations",
            label: "Déclaration de décès",
            description: "Éditer une déclaration",
            icon: "📄",
        });
    }
    if (can("certificatgenremort.view")) {
        documents.push({
            to: "/certificatgenremort",
            label: "Certificat de genre de mort",
            description: "Éditer un certificat",
            icon: "📝",
        });
    }
    if (can("constatdeces.view")) {
        documents.push({
            to: "/constatdeces",
            label: "Certificat de constat de décès",
            description: "Éditer un constat",
            icon: "📝",
        });
    }
    if (documents.length) {
        groupes.push({
            key: "documents",
            label: "Documents",
            icone: "doc",
            items: documents,
        });
    }

    /* =====================================================
       MENU PARAMÈTRES (par sections)
    ===================================================== */
    const sectionsParametres = [];

    const referentiels = [];
    if (can("referentiels.manage")) {
        referentiels.push(
            {
                to: "/Parametres?section=chapelles",
                label: "Chapelles",
                description: "Lieux de recueillement",
                icon: "⛪",
            },
            {
                to: "/Parametres?section=tarifs",
                label: "Tarifs",
                description: "Tarifs de conservation",
                icon: "💵",
            },
            {
                to: "/Parametres?section=prestations",
                label: "Prestations",
                description: "Services funéraires facturés",
                icon: "💼",
            },
            {
                to: "/Parametres?section=services",
                label: "Services d'origine",
                description: "Provenance des défunts",
                icon: "🏥",
            }
        );
    }
    if (referentiels.length) {
        sectionsParametres.push({ titre: "Référentiels", items: referentiels });
    }

    const administration = [];
    if (can("utilisateurs.view")) {
        administration.push({
            to: "/Parametres?section=utilisateurs",
            label: "Utilisateurs",
            description: "Gérer les comptes",
            icon: "👥",
        });
    }
    if (can("roles.view")) {
        administration.push({
            to: "/Parametres?section=roles",
            label: "Rôles & permissions",
            description: "Définir qui peut faire quoi",
            icon: "🔐",
        });
    }
    if (administration.length) {
        sectionsParametres.push({
            titre: "Administration",
            items: administration,
        });
    }

    const suivi = [];
    if (can("historique.view")) {
        suivi.push({
            to: "/Parametres?section=historique",
            label: "Historique",
            description: "Consulter les actions",
            icon: "📜",
        });
    }
    if (can("corbeille.view")) {
        suivi.push({
            to: "/Parametres?section=corbeille",
            label: "Corbeille",
            description: "Éléments supprimés",
            icon: "🗑️",
        });
    }
    if (suivi.length) {
        sectionsParametres.push({ titre: "Suivi", items: suivi });
    }

    const canParametres = sectionsParametres.length > 0;

    return (
        <>
            <nav className="navbar" aria-label="Navigation principale">
                {/* LOGO */}
                <div className="navbar-logo">
                    <div className="logo-text">
                        <img src="/logo.png" alt="Logo" />
                    </div>
                </div>

                {/* MENU PRINCIPAL (bureau) */}
                <div className="navbar-links">
                    {canDashboard && (
                        <NavLink to="/dashboard" className="nav-link">
                            <Icon name="dashboard" />
                            <span>Tableau de bord</span>
                        </NavLink>
                    )}

                    {canDepot && (
                        <NavLink to="/DepotCorps" className="nav-link">
                            <Icon name="depot" />
                            <span>Dépôts</span>
                        </NavLink>
                    )}

                    {canEmplacements && (
                        <NavLink to="/Emplacements" className="nav-link">
                            <Icon name="pin" />
                            <span>Emplacements</span>
                        </NavLink>
                    )}

                    {groupes.map((groupe) => {
                        const ouvert = openMenu === groupe.key;

                        return (
                            <div
                                className="navbar-dropdown-wrapper"
                                key={groupe.key}
                            >
                                <button
                                    type="button"
                                    className={`nav-link navbar-dropdown-btn ${
                                        estSectionActive(groupe.items)
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => basculerMenu(groupe.key)}
                                    aria-expanded={ouvert}
                                    aria-haspopup="true"
                                >
                                    <Icon name={groupe.icone} />
                                    <span>{groupe.label}</span>
                                    <span
                                        className={`navbar-chevron ${
                                            ouvert ? "ouvert" : ""
                                        }`}
                                        aria-hidden="true"
                                    >
                                        ▾
                                    </span>
                                </button>

                                {ouvert && (
                                    <div className="navbar-dropdown">
                                        {groupe.items.map((item) => (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                className="navbar-dropdown-item"
                                                onClick={() => setOpenMenu(null)}
                                            >
                                                <span
                                                    className="navbar-dropdown-icon"
                                                    aria-hidden="true"
                                                >
                                                    {item.icon}
                                                </span>
                                                <span className="navbar-dropdown-content">
                                                    <strong>
                                                        {item.label}
                                                    </strong>
                                                    <small>
                                                        {item.description}
                                                    </small>
                                                </span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {canStatistiques && (
                        <NavLink to="/Statistiques" className="nav-link">
                            <Icon name="chart" />
                            <span>Statistiques</span>
                        </NavLink>
                    )}
                </div>

                {/* RECHERCHE GLOBALE (bureau) */}
                <div className="navbar-recherche">
                    <GlobalSearch />
                </div>

                {/* PARTIE DROITE (bureau) */}
                <div className="navbar-right">
                    {canParametres && (
                        <div className="navbar-dropdown-wrapper">
                            <button
                                type="button"
                                className={`navbar-parametres-btn ${
                                    openMenu === "parametres" ||
                                    location.pathname === "/Parametres"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => basculerMenu("parametres")}
                                title="Paramètres"
                                aria-label="Paramètres"
                                aria-expanded={openMenu === "parametres"}
                                aria-haspopup="true"
                            >
                                <span
                                    className="parametre-icon"
                                    aria-hidden="true"
                                >
                                    <Icon name="settings" size={20} />
                                </span>
                            </button>

                            {openMenu === "parametres" && (
                                <div className="parametres-dropdown">
                                    {sectionsParametres.map((section) => (
                                        <div
                                            className="parametres-groupe"
                                            key={section.titre}
                                        >
                                            <div className="parametres-dropdown-header">
                                                {section.titre}
                                            </div>

                                            {section.items.map((item) => (
                                                <NavLink
                                                    key={item.to}
                                                    to={item.to}
                                                    className="parametres-item"
                                                    onClick={() =>
                                                        setOpenMenu(null)
                                                    }
                                                >
                                                    <span
                                                        className="item-icon"
                                                        aria-hidden="true"
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    <span className="item-content">
                                                        <strong>
                                                            {item.label}
                                                        </strong>
                                                        <small>
                                                            {item.description}
                                                        </small>
                                                    </span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                   
                    {/* UTILISATEUR */}
                    <div className="navbar-user navbar-dropdown-wrapper">
                        <span className="navbar-avatar" aria-hidden="true">
                            {(user?.name || "U").charAt(0).toUpperCase()}
                        </span>

                        <div className="user-info">
                            <strong>{user?.name || "Utilisateur"}</strong>

                            {user?.role_libelle && (
                                <small>{user.role_libelle}</small>
                            )}
                        </div>

                        <button
                            type="button"
                            className="user-arrow"
                            onClick={() => basculerMenu("utilisateur")}
                            aria-label="Menu du compte"
                            aria-expanded={openMenu === "utilisateur"}
                            aria-haspopup="true"
                        >
                            <span
                                className={`navbar-chevron ${
                                    openMenu === "utilisateur" ? "ouvert" : ""
                                }`}
                                aria-hidden="true"
                            >
                                ▾
                            </span>
                        </button>

                        {openMenu === "utilisateur" && (
                            <div className="admin-dropdown user-account-dropdown">
                                <button
                                    type="button"
                                    className="user-dropdown-theme"
                                    onClick={toggleDarkMode}
                                    aria-label={
                                        darkMode
                                            ? "Activer le mode clair"
                                            : "Activer le mode sombre"
                                    }
                                >
                                    <Icon
                                        name={darkMode ? "sun" : "moon"}
                                        size={17}
                                    />
                                    <span>
                                        {darkMode ? "Mode clair" : "Mode sombre"}
                                    </span>
                                </button>

                                <div className="user-dropdown-separator"></div>

                                <button
                                    type="button"
                                    className="user-dropdown-logout"
                                    onClick={handleLogout}
                                >
                                    <span aria-hidden="true">↪</span>
                                    <span>Déconnexion</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOUTON MOBILE */}
                <button
                    type="button"
                    className={`navbar-burger ${mobileOpen ? "ouvert" : ""}`}
                    onClick={basculerTiroir}
                    aria-label={
                        mobileOpen ? "Fermer le menu" : "Ouvrir le menu"
                    }
                    aria-expanded={mobileOpen}
                    aria-controls="navbar-mobile"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            {/* TIROIR MOBILE */}
            {mobileOpen && (
                <>
                    <button
                        type="button"
                        className="navbar-overlay"
                        onClick={fermerMobile}
                        aria-label="Fermer le menu"
                    />

                    <div className="navbar-mobile" id="navbar-mobile">
                        <div className="navbar-mobile-user">
                            <span
                                className="navbar-mobile-avatar"
                                aria-hidden="true"
                            >
                                {(user?.name || "U").charAt(0).toUpperCase()}
                            </span>

                            <div className="user-info">
                                <strong>{user?.name || "Utilisateur"}</strong>

                                {user?.role_libelle && (
                                    <small>{user.role_libelle}</small>
                                )}
                            </div>
                        </div>

                        <nav className="navbar-mobile-nav">
                            <GlobalSearch
                                variante="mobile"
                                onNaviguer={fermerMobile}
                            />

                            {canDashboard && (
                                <NavLink
                                    to="/dashboard"
                                    className="navbar-mobile-lien"
                                    onClick={fermerMobile}
                                >
                                    Tableau de bord
                                </NavLink>
                            )}

                            {canDepot && (
                                <NavLink
                                    to="/DepotCorps"
                                    className="navbar-mobile-lien"
                                    onClick={fermerMobile}
                                >
                                    Dépôts
                                </NavLink>
                            )}

                            {canEmplacements && (
                                <NavLink
                                    to="/Emplacements"
                                    className="navbar-mobile-lien"
                                    onClick={fermerMobile}
                                >
                                    Emplacements
                                </NavLink>
                            )}

                            {groupes.map((groupe) => (
                                <div
                                    className="navbar-mobile-groupe"
                                    key={groupe.key}
                                >
                                    <button
                                        type="button"
                                        className="navbar-mobile-lien navbar-mobile-groupe-btn"
                                        onClick={() =>
                                            setMobileSection((section) =>
                                                section === groupe.key
                                                    ? null
                                                    : groupe.key
                                            )
                                        }
                                        aria-expanded={
                                            mobileSection === groupe.key
                                        }
                                    >
                                        <span>{groupe.label}</span>
                                        <span
                                            className={`navbar-chevron ${
                                                mobileSection === groupe.key
                                                    ? "ouvert"
                                                    : ""
                                            }`}
                                            aria-hidden="true"
                                        >
                                            ▾
                                        </span>
                                    </button>

                                    {mobileSection === groupe.key && (
                                        <div className="navbar-mobile-sous-menu">
                                            {groupe.items.map((item) => (
                                                <NavLink
                                                    key={item.to}
                                                    to={item.to}
                                                    className="navbar-mobile-sous-lien"
                                                    onClick={fermerMobile}
                                                >
                                                    {item.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {canStatistiques && (
                                <NavLink
                                    to="/Statistiques"
                                    className="navbar-mobile-lien"
                                    onClick={fermerMobile}
                                >
                                    Statistiques
                                </NavLink>
                            )}

                            {canParametres && (
                                <div className="navbar-mobile-groupe">
                                    <button
                                        type="button"
                                        className="navbar-mobile-lien navbar-mobile-groupe-btn"
                                        onClick={() =>
                                            setMobileSection((section) =>
                                                section === "parametres"
                                                    ? null
                                                    : "parametres"
                                            )
                                        }
                                        aria-expanded={
                                            mobileSection === "parametres"
                                        }
                                    >
                                        <span>Paramètres</span>
                                        <span
                                            className={`navbar-chevron ${
                                                mobileSection === "parametres"
                                                    ? "ouvert"
                                                    : ""
                                            }`}
                                            aria-hidden="true"
                                        >
                                            ▾
                                        </span>
                                    </button>

                                    {mobileSection === "parametres" && (
                                        <div className="navbar-mobile-sous-menu">
                                            {sectionsParametres.map(
                                                (section) => (
                                                    <div key={section.titre}>
                                                        <div className="navbar-mobile-section-titre">
                                                            {section.titre}
                                                        </div>

                                                        {section.items.map(
                                                            (item) => (
                                                                <NavLink
                                                                    key={
                                                                        item.to
                                                                    }
                                                                    to={item.to}
                                                                    className="navbar-mobile-sous-lien"
                                                                    onClick={
                                                                        fermerMobile
                                                                    }
                                                                >
                                                                    {
                                                                        item.label
                                                                    }
                                                                </NavLink>
                                                            )
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </nav>

                        <div className="navbar-mobile-actions">
                            <button
                                type="button"
                                className="navbar-theme-btn"
                                onClick={toggleDarkMode}
                                title={darkMode ? "Mode clair" : "Mode sombre"}
                                aria-label={darkMode ? "Mode clair" : "Mode sombre"}
                            >
                                <Icon name={darkMode ? "sun" : "moon"} size={18} />
                                <span>{darkMode ? "Mode clair" : "Mode sombre"}</span>
                            </button>

                            <div className="navbar-separator"></div>

                            <button
                                type="button"
                                className="deconnexion"
                                onClick={handleLogout}
                            >
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default Navbar;
