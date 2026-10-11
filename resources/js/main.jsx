import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";    /* 1. Thème global (variables + reset) */
import "./theme.css";    /* 2. Classes réutilisables */
import "./dark-mode.css"; /* 3. Mode sombre (si vous l'avez créé) */

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);