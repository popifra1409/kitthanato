<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Synchronise le catalogue config/permissions.php avec la base.
 *
 * Utilise le Query Builder (et non les modèles) pour pouvoir être appelé
 * depuis une migration sans dépendre de l'état des modèles.
 */
class PermissionRegistrar
{
    /** Liste à plat des permissions : code => [module, libelle]. */
    public static function catalogue(): array
    {
        $liste = [];

        foreach (config('permissions.modules', []) as $module => $def) {
            foreach ($def['permissions'] as $action => $libelle) {
                $liste["{$module}.{$action}"] = [
                    'module' => $module,
                    'libelle' => $libelle,
                ];
            }
        }

        return $liste;
    }

    /**
     * Complète une liste de permissions avec leurs dépendances
     * (config permissions.dependances + « module.view » implicite).
     */
    public static function avecDependances(array $codes): array
    {
        $catalogue = self::catalogue();
        $dependances = config('permissions.dependances', []);
        $resultat = [];
        $file = array_values($codes);

        while ($file) {
            $code = array_shift($file);
            if (isset($resultat[$code]) || !isset($catalogue[$code])) {
                continue;
            }
            $resultat[$code] = true;

            $vue = $catalogue[$code]['module'] . '.view';
            if ($vue !== $code && isset($catalogue[$vue])) {
                $file[] = $vue;
            }
            foreach ($dependances[$code] ?? [] as $dep) {
                $file[] = $dep;
            }
        }

        return array_keys($resultat);
    }

    /**
     * @param bool $resetRoles  Réapplique les permissions par défaut aux
     *                          rôles définis dans la config.
     * @return array{permissions:int, roles:int}
     */
    public static function sync(bool $resetRoles = false): array
    {
        $now = now();
        $catalogue = self::catalogue();

        foreach ($catalogue as $code => $def) {
            DB::table('permissions')->updateOrInsert(
                ['code' => $code],
                ['module' => $def['module'], 'libelle' => $def['libelle'], 'updated_at' => $now]
            );
        }
        DB::table('permissions')->whereNull('created_at')->update(['created_at' => $now]);

        // Supprime les permissions retirées du catalogue
        DB::table('permissions')->whereNotIn('code', array_keys($catalogue))->delete();

        $permissionIds = DB::table('permissions')->pluck('id', 'code');
        $rolesCrees = 0;

        foreach (config('permissions.roles', []) as $code => $def) {
            $role = DB::table('roles')->where('code', $code)->first();

            if (!$role) {
                $roleId = DB::table('roles')->insertGetId([
                    'code' => $code,
                    'libelle' => $def['libelle'],
                    'description' => $def['description'] ?? null,
                    'is_system' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $rolesCrees++;
            } else {
                $roleId = $role->id;
                DB::table('roles')->where('id', $roleId)->update(['is_system' => true]);
                if (!$resetRoles) {
                    continue;
                }
            }

            $codes = in_array('*', $def['permissions'], true)
                ? $permissionIds->keys()->all()
                : $def['permissions'];

            DB::table('permission_role')->where('role_id', $roleId)->delete();
            DB::table('permission_role')->insert(
                collect($codes)
                    ->filter(fn ($c) => isset($permissionIds[$c]))
                    ->map(fn ($c) => ['role_id' => $roleId, 'permission_id' => $permissionIds[$c]])
                    ->values()
                    ->all()
            );
        }

        // Le super-admin reçoit toujours toutes les permissions (y compris nouvelles)
        $superAdmin = DB::table('roles')->where('code', config('permissions.super_admin_role'))->first();
        if ($superAdmin) {
            DB::table('permission_role')->insertOrIgnore(
                $permissionIds->values()
                    ->map(fn ($id) => ['role_id' => $superAdmin->id, 'permission_id' => $id])
                    ->all()
            );
        }

        return ['permissions' => count($catalogue), 'roles' => $rolesCrees];
    }
}
