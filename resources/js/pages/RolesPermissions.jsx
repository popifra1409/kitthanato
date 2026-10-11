import { useEffect, useMemo, useState } from "react";
import api, { asList } from "../services/api";
import { hasPermission } from "../services/session";

/* =========================================================
   RÔLES & PERMISSIONS
   - Liste des rôles (système / personnalisés)
   - Matrice des permissions par module (cases à cocher)
========================================================= */

const formVide = () => ({
    id: null,
    code: "",
    libelle: "",
    description: "",
    permissions: [],
    is_system: false,
    is_super_admin: false,
});

function RolesPermissions({ onChange, showNotif, openConfirm }) {
    const [roles, setRoles] = useState([]);
    const [catalogue, setCatalogue] = useState([]);
    const [dependances, setDependances] = useState({});
    const [form, setForm] = useState(formVide());
    const [chargement, setChargement] = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);

    const peutGerer = hasPermission("roles.manage");

    const charger = async () => {
        setChargement(true);
        try {
            const [r, p] = await Promise.all([api.roles.list(), api.permissions.list()]);
            setRoles(asList(r));
            setCatalogue(asList(p, "modules"));
            setDependances(p?.dependances || {});
        } catch (error) {
            showNotif("error", "Erreur", error.message || "Impossible de charger les rôles.");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selection = useMemo(() => new Set(form.permissions), [form.permissions]);
    const verrouille = !peutGerer || form.is_super_admin;

    /* Cocher ajoute les permissions requises ; décocher retire celles qui en dépendent. */
    const avecDependances = (codes) =>
        Array.from(new Set(codes.flatMap((c) => [c, ...(dependances[c] || [])])));

    const sansDependants = (codes, retirees) =>
        codes.filter(
            (c) =>
                !retirees.includes(c) &&
                !(dependances[c] || []).some((d) => retirees.includes(d))
        );

    const basculer = (code) => {
        if (verrouille) return;
        setForm((f) => ({
            ...f,
            permissions: selection.has(code)
                ? sansDependants(f.permissions, [code])
                : avecDependances([...f.permissions, code]),
        }));
    };

    const basculerModule = (module) => {
        if (verrouille) return;
        const codes = module.permissions.map((p) => p.code);
        const tousCoches = codes.every((c) => selection.has(c));
        setForm((f) => ({
            ...f,
            permissions: tousCoches
                ? sansDependants(f.permissions, codes)
                : avecDependances([...f.permissions, ...codes]),
        }));
    };

    const editer = (role) => {
        setForm({
            id: role.id,
            code: role.code,
            libelle: role.libelle,
            description: role.description || "",
            permissions: role.permissions || [],
            is_system: role.is_system,
            is_super_admin: role.is_super_admin,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const enregistrer = async (e) => {
        e.preventDefault();
        setEnregistrement(true);

        const donnees = {
            code: form.code,
            libelle: form.libelle,
            description: form.description,
            permissions: form.permissions,
        };

        try {
            if (form.id) {
                await api.roles.update(form.id, donnees);
            } else {
                await api.roles.create(donnees);
            }
            showNotif(
                "success",
                form.id ? "Rôle modifié" : "Rôle créé",
                "Les droits s'appliquent dès la prochaine action des utilisateurs concernés."
            );
            setForm(formVide());
            await charger();
            onChange?.();
        } catch (error) {
            showNotif("error", "Échec", error.firstMessage || error.message);
        } finally {
            setEnregistrement(false);
        }
    };

    const supprimer = (role) => {
        openConfirm({
            title: "Supprimer le rôle ?",
            message: `Le rôle "${role.libelle}" sera supprimé.`,
            confirmLabel: "Supprimer",
            type: "danger",
            onConfirm: async () => {
                try {
                    await api.roles.remove(role.id);
                    showNotif("success", "Rôle supprimé", `Le rôle "${role.libelle}" a été supprimé.`);
                    if (form.id === role.id) setForm(formVide());
                    await charger();
                    onChange?.();
                } catch (error) {
                    showNotif("error", "Échec", error.message);
                    throw error;
                }
            },
        });
    };

    return (
        <section className="param-section roles-section">
            <div className="section-title">
                <h2>
                    {form.id ? `Modifier le rôle « ${form.libelle} »` : "Créer un rôle"}
                </h2>
                {form.id && (
                    <button className="secondary-button" onClick={() => setForm(formVide())}>
                        Annuler
                    </button>
                )}
            </div>

            <form onSubmit={enregistrer}>
                <div className="settings-form">
                    <div className="form-field">
                        <label>Code</label>
                        <input
                            value={form.code}
                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                            placeholder="EX : CAISSIER"
                            disabled={form.is_system || !peutGerer}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label>Libellé</label>
                        <input
                            value={form.libelle}
                            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                            placeholder="Ex : Caissier"
                            disabled={!peutGerer}
                            required
                        />
                    </div>
                    <div className="form-field roles-description">
                        <label>Description</label>
                        <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            disabled={!peutGerer}
                        />
                    </div>
                </div>

                <p className="roles-hint">
                    Les permissions nécessaires au fonctionnement d'une page sont
                    cochées automatiquement (ex. « Encaisser un paiement » ajoute
                    « Consulter les sorties » et « Consulter les dépôts »).
                </p>

                {form.is_super_admin && (
                    <p className="roles-hint">
                        Le rôle administrateur possède toujours toutes les permissions.
                    </p>
                )}

                <div className="permissions-grid">
                    {catalogue.map((module) => {
                        const codes = module.permissions.map((p) => p.code);
                        const nb = codes.filter((c) => selection.has(c)).length;
                        return (
                            <fieldset key={module.module} className="permission-module">
                                <legend>
                                    <label className="permission-module-toggle">
                                        <input
                                            type="checkbox"
                                            checked={nb === codes.length}
                                            ref={(el) => {
                                                if (el) el.indeterminate = nb > 0 && nb < codes.length;
                                            }}
                                            onChange={() => basculerModule(module)}
                                            disabled={verrouille}
                                        />
                                        {module.libelle}
                                    </label>
                                    <span className="permission-count">
                                        {nb}/{codes.length}
                                    </span>
                                </legend>
                                {module.permissions.map((perm) => (
                                    <label key={perm.code} className="permission-item">
                                        <input
                                            type="checkbox"
                                            checked={selection.has(perm.code)}
                                            onChange={() => basculer(perm.code)}
                                            disabled={verrouille}
                                        />
                                        <span>{perm.libelle}</span>
                                        <code>{perm.code}</code>
                                    </label>
                                ))}
                            </fieldset>
                        );
                    })}
                </div>

                {peutGerer && (
                    <button className="primary-button" type="submit" disabled={enregistrement}>
                        {enregistrement
                            ? "Enregistrement..."
                            : form.id
                            ? "Enregistrer le rôle"
                            : "Créer le rôle"}
                    </button>
                )}
            </form>

            <div className="settings-table-wrapper">
                <table className="settings-table">
                    <thead>
                        <tr>
                            <th>Rôle</th>
                            <th>Code</th>
                            <th>Permissions</th>
                            <th>Comptes</th>
                            <th>Modifié par</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chargement && (
                            <tr>
                                <td colSpan="6">Chargement...</td>
                            </tr>
                        )}
                        {!chargement &&
                            roles.map((role) => (
                                <tr key={role.id}>
                                    <td>
                                        <strong>{role.libelle}</strong>
                                        {role.description && (
                                            <div className="trace-by">{role.description}</div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`role-badge role-${role.code.toLowerCase()}`}>
                                            {role.code}
                                        </span>
                                        {role.is_system && <div className="trace-by">système</div>}
                                    </td>
                                    <td>{role.is_super_admin ? "Toutes" : role.permissions.length}</td>
                                    <td>{role.users_count}</td>
                                    <td>
                                        {role.modificateur?.name || role.createur?.name || "—"}
                                        {role.updated_at && (
                                            <div className="trace-by">
                                                {new Date(role.updated_at).toLocaleString("fr-FR")}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <button className="action-edit" onClick={() => editer(role)}>
                                            {peutGerer ? "Modifier" : "Voir"}
                                        </button>
                                        {peutGerer && !role.is_system && (
                                            <button className="action-delete" onClick={() => supprimer(role)}>
                                                Supprimer
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default RolesPermissions;
