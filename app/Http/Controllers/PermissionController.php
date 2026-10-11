<?php

namespace App\Http\Controllers;

use App\Models\Permission;

class PermissionController extends Controller
{
    /**
     * GET /api/permissions
     * Catalogue groupé par module, pour construire la matrice des droits.
     */
    public function index()
    {
        $modules = config('permissions.modules', []);

        $groupes = Permission::orderBy('id')->get(['id', 'code', 'module', 'libelle'])
            ->groupBy('module')
            ->map(fn ($perms, $module) => [
                'module' => $module,
                'libelle' => $modules[$module]['libelle'] ?? ucfirst($module),
                'permissions' => $perms->values(),
            ])
            ->values();

        return response()->json([
            'modules' => $groupes,
            // Pour que l'écran coche automatiquement les permissions requises
            'dependances' => collect(\App\Support\PermissionRegistrar::catalogue())
                ->keys()
                ->mapWithKeys(fn ($code) => [
                    $code => array_values(array_diff(\App\Support\PermissionRegistrar::avecDependances([$code]), [$code])),
                ])
                ->filter()
                ->all(),
        ]);
    }
}
