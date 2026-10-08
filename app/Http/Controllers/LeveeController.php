<?php

namespace App\Http\Controllers;

use App\Models\Levee;

class LeveeController extends Controller
{
    /**
     * Afficher toutes les levées.
     */
    public function index()
    {
        $levees = Levee::with([
            'sortie.depot'
        ])
        ->orderBy('date')
        ->orderBy('heure')
        ->get();

        return response()->json($levees);
    }
}