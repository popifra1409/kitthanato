<?php

namespace App\Http\Controllers;

use App\Models\Corbeille;

abstract class Controller
{
    protected function mettreEnCorbeille(
        string $elementType,
        int $elementId,
        array $donnees,
        ?string $raison = null
    ): void {
        $user = auth()->user();

        Corbeille::create([
            'element_type' => $elementType,
            'element_id'   => $elementId,
            'donnees'      => $donnees,
            'user_id'      => $user?->id,
            'user_name'    => $user?->name ?? 'Système',
            'ip_address'   => request()->ip(),
            'raison'       => $raison,
        ]);
    }
} 