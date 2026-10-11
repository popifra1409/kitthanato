# THANATO — Laravel + React

Application de gestion de morgue (dépôts, sorties, transferts, levées, déclarations de décès).
Le front React et l'API Laravel vivent maintenant dans **un seul projet** : Laravel sert
l'application React (via Vite) et l'API REST sous `/api`.

---

## 1. Installation

```bash
composer install
npm install
cp .env.example .env        # puis renseigner DB_* (PostgreSQL)
php artisan key:generate
php artisan migrate         # crée aussi les rôles/permissions et convertit les anciens rôles
php artisan db:seed         # (installation neuve) compte « Administrateur » / Admin@1234
```

### Développement

```bash
composer run dev            # php artisan serve + queue + logs + vite (HMR React)
```

Ouvrir http://127.0.0.1:8000 — plus besoin de lancer un front séparé ni de configurer CORS.

### Production

```bash
npm run build               # génère public/build
php artisan migrate --force
php artisan optimize
```

Le serveur web doit pointer sur `public/`. Toutes les URL non-API renvoient la vue
`resources/views/app.blade.php`, qui monte React ; react-router gère ensuite la navigation.

---

## 2. Organisation du front (`resources/js`)

```
resources/js/
├── main.jsx                 point d'entrée Vite
├── App.jsx                  routes + permission requise par page
├── services/
│   ├── api.js               ★ TOUS les appels à l'API REST
│   ├── http.js              client axios (URL de base, token, erreurs, 401)
│   ├── session.js           token / utilisateur / hasPermission()
│   └── SessionContext.jsx   useSession() : user, can(), login(), logout()
├── components/              Navbar, ProtectedRoute, dialogues…
└── pages/                   une page par écran (+ RolesPermissions.jsx)
```

### Appeler le backend

**Aucune URL ne doit être écrite dans une page.** On passe toujours par `services/api.js` :

```js
import api, { asList } from "../services/api";

const depots = asList(await api.depots.list());
await api.depots.create(donnees);
await api.depots.update(id, donnees);
await api.depots.remove(id, "Doublon");          // raison → corbeille
await api.sorties.paiement(sortieId, 15000);
```

- Le token Bearer est ajouté automatiquement.
- Les fonctions renvoient directement le JSON.
- En cas d'erreur, une `ApiError` est levée : `error.message`, `error.status`,
  `error.errors` (validation Laravel), `error.firstMessage` (premier message lisible).
- Un `401` vide la session et renvoie à l'écran de connexion.

**Nouvel endpoint ?** Ajoutez-le dans `api.js` (une ligne), jamais dans la page.

### Droits côté front

```jsx
import { hasPermission } from "../services/session";
{hasPermission("depots.delete") && <button>Supprimer</button>}

// ou dans un composant :
const { can } = useSession();
```

Les pages sont protégées dans `App.jsx` (`permission: "sorties.view"`). Le front ne fait
que masquer : **la vraie sécurité est dans l'API** (chaque route vérifie sa permission).

---

## 3. Utilisateurs, rôles et permissions

| Élément | Où |
|---|---|
| Catalogue des permissions + rôles par défaut | `config/permissions.php` |
| Tables | `roles`, `permissions`, `permission_role`, `users.role_id` |
| Vérification API | middleware `permission:depots.create` (ou `a\|b` pour l'un OU l'autre) |
| Vérification PHP | `$user->hasPermission('depots.create')` ou `$user->can('depots.create')` |
| Écran | Paramètres → **Rôles & permissions** / **Utilisateurs** |

- **ADMIN** est super-administrateur : il a toujours tout, ne peut pas être supprimé,
  et on ne peut pas supprimer/rétrograder/désactiver le **dernier** admin actif.
- Rôles par défaut : `USER1` (Thanatopracteur), `USER2` (Médecin légiste). On peut en créer
  d'autres (ex. Caissier) et cocher leurs permissions.
- Cocher une permission coche aussi celles dont la page a besoin
  (`config/permissions.php` → `dependances`).
- Un compte peut être **désactivé** (connexion refusée, sessions coupées) ou **supprimé**
  (suppression logique : il reste visible dans l'historique et les « créé par »).
- Changement de rôle ou désactivation ⇒ les sessions ouvertes de ce compte sont fermées.

Ajouter une permission : l'ajouter dans `config/permissions.php`, puis

```bash
php artisan permissions:sync                # ajoute les nouvelles, garde les réglages des rôles
php artisan permissions:sync --reset-roles  # réapplique les droits par défaut d'ADMIN/USER1/USER2
```

---

## 4. Traçabilité (« qui a fait quoi »)

### `created_by` / `updated_by`

Présents sur : users, roles, depots, sorties, levees, transferts, prestations, chapelles,
professions, services, declaration_deces, finance_to_sortie.

Ils sont remplis **automatiquement** par le trait `App\Models\Concerns\TracksUser` avec
l'utilisateur connecté (impossible de les forcer depuis un formulaire). Relations :

```php
Depot::with(Depot::TRACE)->get();   // charge createur et modificateur (id, name)
$depot->createur->name;
```

### Journal d'audit (`audit_logs`, écran Paramètres → Historique)

Le trait `LogsActivity` enregistre chaque **CREATION**, **MODIFICATION** (avec les seuls
champs modifiés : avant → après) et **SUPPRESSION**, avec l'utilisateur, l'IP, le
navigateur et l'élément concerné (`auditable_type` / `auditable_id`).

Les actions métier sont tracées explicitement : `CONNEXION`, `ECHEC_CONNEXION`,
`DECONNEXION`, `MOT_DE_PASSE`, `PAIEMENT` (montant encaissé + encaisseur),
`PERMISSIONS` (permissions ajoutées / retirées d'un rôle).

Pour tracer une nouvelle action :

```php
use App\Support\Audit;
Audit::log('SORTIES', 'ANNULATION', "Annulation de la sortie #{$sortie->id}", ['motif' => $motif], $sortie);
```

Filtres de l'API : `GET /api/historique?module=DEPOTS&action=MODIFICATION&user_id=3&du=2026-10-01&au=2026-10-31`
et l'historique d'un élément : `?sujet_type=Depot&sujet_id=12`.

Les mots de passe, tokens et signatures ne sont jamais écrits dans le journal.

---

## 5. Tests

Les tests utilisent PostgreSQL (le code utilise `ILIKE`). Créez une base dédiée :

```bash
createdb kit_thanato_testing
php artisan test
```
