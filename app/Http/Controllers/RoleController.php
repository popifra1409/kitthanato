<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Support\Audit;
use App\Support\PermissionRegistrar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /** GET /api/roles */
    public function index()
    {
        $roles = Role::with(['permissions:id,code', ...Role::TRACE])
            ->withCount('users')
            ->orderByDesc('is_system')
            ->orderBy('libelle')
            ->get();

        return response()->json($roles->map(fn (Role $r) => $this->presenter($r)));
    }

    /** GET /api/roles/{id} */
    public function show($id)
    {
        $role = Role::with(['permissions:id,code', ...Role::TRACE])->withCount('users')->findOrFail($id);

        return response()->json($this->presenter($role));
    }

    /** POST /api/roles */
    public function store(Request $request)
    {
        $data = $this->valider($request);

        $role = DB::transaction(function () use ($data) {
            $role = Role::create([
                'code' => $data['code'],
                'libelle' => $data['libelle'],
                'description' => $data['description'] ?? null,
            ]);

            $this->synchroniserPermissions($role, $data['permissions'] ?? []);

            return $role;
        });

        return response()->json([
            'message' => 'Rôle créé avec succès.',
            'role' => $this->presenter($role->load(['permissions:id,code', ...Role::TRACE])->loadCount('users')),
        ], 201);
    }

    /** PUT /api/roles/{id} */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        $data = $this->valider($request, $role);

        DB::transaction(function () use ($role, $data) {
            $role->libelle = $data['libelle'];
            $role->description = $data['description'] ?? null;

            // Le code d'un rôle système (ADMIN, USER1, USER2) est figé
            if (!$role->is_system) {
                $role->code = $data['code'];
            }

            $role->save();

            // Le super-admin garde toujours toutes les permissions
            if (!$role->isSuperAdmin() && array_key_exists('permissions', $data)) {
                $this->synchroniserPermissions($role, $data['permissions'] ?? []);
            }
        });

        // Les sessions des utilisateurs de ce rôle prennent les nouveaux droits
        // à la prochaine requête (permissions relues en base à chaque appel).

        return response()->json([
            'message' => 'Rôle modifié avec succès.',
            'role' => $this->presenter($role->fresh(['permissions:id,code', ...Role::TRACE])->loadCount('users')),
        ]);
    }

    /** DELETE /api/roles/{id} */
    public function destroy($id)
    {
        $role = Role::withCount('users')->findOrFail($id);

        if ($role->is_system) {
            return response()->json(['message' => 'Un rôle système ne peut pas être supprimé.'], 422);
        }

        if ($role->users_count > 0) {
            return response()->json([
                'message' => "Ce rôle est attribué à {$role->users_count} compte(s). Réaffectez-les avant de le supprimer.",
            ], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Rôle supprimé.']);
    }

    /* ============================================================ */

    private function valider(Request $request, ?Role $role = null): array
    {
        $request->merge([
            'code' => strtoupper(preg_replace('/[^A-Za-z0-9_]/', '_', trim((string) $request->input('code', $role?->code)))),
        ]);

        return $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('roles', 'code')->ignore($role?->id)],
            'libelle' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'exists:permissions,code'],
        ]);
    }

    private function synchroniserPermissions(Role $role, array $codes): void
    {
        $avant = $role->permissions()->pluck('code')->sort()->values()->all();

        $ids = Permission::whereIn('code', PermissionRegistrar::avecDependances($codes))->pluck('id');
        $role->permissions()->sync($ids);

        $apres = $role->permissions()->pluck('code')->sort()->values()->all();

        if ($avant !== $apres) {
            Audit::log('ROLES', 'PERMISSIONS', "Permissions du rôle {$role->code} modifiées", [
                'ajoutees' => array_values(array_diff($apres, $avant)),
                'retirees' => array_values(array_diff($avant, $apres)),
            ], $role);
        }
    }

    private function presenter(Role $role): array
    {
        return [
            'id' => $role->id,
            'code' => $role->code,
            'libelle' => $role->libelle,
            'description' => $role->description,
            'is_system' => (bool) $role->is_system,
            'is_super_admin' => $role->isSuperAdmin(),
            'users_count' => $role->users_count ?? 0,
            'permissions' => $role->isSuperAdmin()
                ? Permission::pluck('code')->all()
                : $role->permissions->pluck('code')->values()->all(),
            'createur' => $role->createur?->only(['id', 'name']),
            'modificateur' => $role->modificateur?->only(['id', 'name']),
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ];
    }
}
