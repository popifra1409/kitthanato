<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GestionUtilisateurController extends Controller
{
    /**
     * GET /api/utilisateurs
     * ?recherche=  ?role=CODE  ?actif=1|0  ?avec_supprimes=1
     */
    public function index(Request $request)
    {
        $query = User::with(['roleModel:id,code,libelle', ...User::TRACE])
            ->orderBy('name');

        if ($request->boolean('avec_supprimes')) {
            $query->withTrashed();
        }

        if ($request->filled('recherche')) {
            $query->where('name', 'ILIKE', '%' . $request->recherche . '%');
        }

        if ($request->filled('role')) {
            $query->whereHas('roleModel', fn ($q) => $q->where('code', strtoupper($request->role)));
        }

        if ($request->has('actif')) {
            $query->where('is_active', $request->boolean('actif'));
        }

        return response()->json(
            $query->get()->map(fn (User $u) => $this->presenter($u))
        );
    }

    /** GET /api/utilisateurs/{id} */
    public function show($id)
    {
        $user = User::withTrashed()
            ->with(['roleModel:id,code,libelle', ...User::TRACE])
            ->findOrFail($id);

        return response()->json($this->presenter($user));
    }

    /** POST /api/utilisateurs */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:users,name'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'role' => ['required_without:role_id', 'nullable', 'string'],
            'role_id' => ['required_without:role', 'nullable', 'integer', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $role = $this->resoudreRole($data);
        $this->verifierPeutAttribuer($request->user(), $role);

        $user = User::create([
            'name' => trim($data['name']),
            'password' => $data['password'],
            'role_id' => $role->id,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Compte créé avec succès.',
            'user' => $this->presenter($user->load(['roleModel', ...User::TRACE])),
        ], 201);
    }

    /** PUT /api/utilisateurs/{id} */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('users', 'name')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'],
            'role' => ['required_without:role_id', 'nullable', 'string'],
            'role_id' => ['required_without:role', 'nullable', 'integer', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $role = $this->resoudreRole($data);
        $this->verifierPeutAttribuer($request->user(), $role);

        return DB::transaction(function () use ($user, $data, $role, $request) {
            $perdAdmin = $user->isSuperAdmin() && !$role->isSuperAdmin();
            $seDesactive = array_key_exists('is_active', $data) && !$data['is_active'];

            if ($user->id === $request->user()->id && ($perdAdmin || $seDesactive)) {
                throw ValidationException::withMessages([
                    'role' => 'Vous ne pouvez pas retirer vos propres droits d\'administrateur ni désactiver votre compte.',
                ]);
            }

            if ($perdAdmin || ($seDesactive && $user->isSuperAdmin())) {
                $this->verifierResteUnAdmin($user);
            }

            $user->name = trim($data['name']);
            $user->role_id = $role->id;

            if (array_key_exists('is_active', $data)) {
                $user->is_active = $data['is_active'];
            }

            if (!empty($data['password'])) {
                $user->password = $data['password'];
                Audit::log('UTILISATEURS', 'MOT_DE_PASSE',
                    "Réinitialisation du mot de passe de {$user->name}", [], $user);
            }

            $user->save();

            // Changement de rôle ou désactivation : on coupe les sessions ouvertes
            if ($user->wasChanged(['role_id', 'is_active']) && $user->id !== $request->user()->id) {
                $user->tokens()->delete();
            }

            return response()->json([
                'message' => 'Compte modifié avec succès.',
                'user' => $this->presenter($user->fresh(['roleModel', ...User::TRACE])),
            ]);
        });
    }

    /** POST /api/utilisateurs/{id}/toggle-actif */
    public function toggleActif(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas désactiver votre propre compte.'], 422);
        }

        if ($user->is_active && $user->isSuperAdmin()) {
            $this->verifierResteUnAdmin($user);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => $user->is_active ? 'Compte réactivé.' : 'Compte désactivé.',
            'user' => $this->presenter($user->load(['roleModel', ...User::TRACE])),
        ]);
    }

    /**
     * DELETE /api/utilisateurs/{id}
     * Suppression logique (soft delete) : le compte disparaît des listes
     * mais reste lié à tout ce qu'il a créé / modifié (traçabilité).
     */
    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        if ($user->isSuperAdmin()) {
            $this->verifierResteUnAdmin($user);
        }

        $user->tokens()->delete();
        $user->is_active = false;
        $user->save();
        $user->delete();

        return response()->json(['message' => 'Compte supprimé avec succès.']);
    }

    /* ============================================================
       OUTILS
    ============================================================ */

    private function resoudreRole(array $data): Role
    {
        $role = !empty($data['role_id'])
            ? Role::find($data['role_id'])
            : Role::where('code', strtoupper(trim($data['role'])))->first();

        if (!$role) {
            throw ValidationException::withMessages(['role' => 'Rôle inconnu.']);
        }

        return $role;
    }

    /** Seul un super-admin peut créer / promouvoir un super-admin. */
    private function verifierPeutAttribuer(User $acteur, Role $role): void
    {
        if ($role->isSuperAdmin() && !$acteur->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role' => 'Seul un administrateur peut attribuer le rôle administrateur.',
            ]);
        }
    }

    /** Empêche de se retrouver sans aucun administrateur actif. */
    private function verifierResteUnAdmin(User $user): void
    {
        $autres = User::where('id', '!=', $user->id)
            ->where('is_active', true)
            ->whereHas('roleModel', fn ($q) => $q->where('code', config('permissions.super_admin_role')))
            ->exists();

        if (!$autres) {
            throw ValidationException::withMessages([
                'role' => 'Impossible : ce compte est le dernier administrateur actif.',
            ]);
        }
    }

    private function presenter(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->roleModel?->code,
            'role_id' => $user->role_id,
            'role_libelle' => $user->roleModel?->libelle,
            'is_active' => (bool) $user->is_active,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'deleted_at' => $user->deleted_at,
            'createur' => $user->createur?->only(['id', 'name']),
            'modificateur' => $user->modificateur?->only(['id', 'name']),
        ];
    }
}
