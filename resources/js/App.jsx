import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DepotCorps from "./pages/DepotCorps";
import Navbar from "./components/Navbar";
import Transfert from "./pages/Transfert";
import PlanningLevees from "./pages/PlanningLevees";
import Sortie from "./pages/Sortie";
import Statistiques from "./pages/Statistiques";
import DashboardDeclaration from "./pages/DashboardDeclaration";
import Parametres from "./pages/Parametres";
import AccesRefuse from "./pages/AccesRefuse";
import ProtectedRoute from "./components/ProtectedRoute";
import Recu from "./pages/Recu";
import DeclarationDeces from "./pages/DeclarationDeces";
import { SessionProvider } from "./services/SessionContext";
import GenreDeMort from "./pages/GenreDeMort";
import Emplacements from "./pages/Emplacements";

/* =====================================================
   ROUTES PROTÉGÉES
   Chaque page exige une permission (voir config/permissions.php
   côté Laravel). Les droits se règlent dans
   Paramètres → Rôles & permissions.
===================================================== */
const PAGES = [
    { path: "/dashboard", permission: "dashboard.view", element: <Dashboard /> },
    { path: "/DepotCorps", permission: "depots.view", element: <DepotCorps /> },
    { path: "/Emplacements", permission: "emplacements.view", element: <Emplacements /> },
    { path: "/transfert", permission: "transferts.view", element: <Transfert /> },
    { path: "/PlanningLevees", permission: "levees.view", element: <PlanningLevees /> },
    { path: "/Sortie", permission: "sorties.view", element: <Sortie /> },
    { path: "/Statistiques", permission: "statistiques.view", element: <Statistiques /> },
    { path: "/declarations", permission: "declarations.view", element: <DashboardDeclaration /> },
    {path: "/Parametres", permission: [
            "utilisateurs.view",
            "roles.view",
            "referentiels.manage",
            "historique.view",
            "corbeille.view",
        ],
        element: <Parametres />,
    },
{
  path: "/certificatgenremort",
  permission: "certificatgenremort.view",
  element: <GenreDeMort />,
},
{
  path: "/certificatgenremort/:depotId",
  permission: "certificatgenremort.view",
  element: <GenreDeMort />,
},
];

function App() {
    return (
        <SessionProvider>
            <BrowserRouter>
                <Routes>
                    {/* CONNEXION */}
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />

                    {/* ACCÈS REFUSÉ */}
                    <Route path="/acces-refuse" element={<AccesRefuse />} />

                    {PAGES.map(({ path, permission, element }) => (
                        <Route
                            key={path}
                            path={path}
                            element={
                                <ProtectedRoute permission={permission}>
                                    <PageWithNavbar>{element}</PageWithNavbar>
                                </ProtectedRoute>
                            }
                        />
                    ))}

                    {/* Pages d'impression */}
                    <Route path="/recu" element={<Recu />} />
                    <Route path="/declarationdeces" element={<DeclarationDeces />} />

                    {/* 404 → LOGIN */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </SessionProvider>
    );
}

function PageWithNavbar({ children }) {
    return (
        <>
            <Navbar />
            <main className="page-content">{children}</main>
        </>
    );
}

export default App;
