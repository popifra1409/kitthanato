<?php

namespace App\Http\Controllers;

use App\Models\Corbeille;
use Illuminate\Http\Request;

class CorbeilleController extends Controller
{
    /* =====================================================
       LISTE DE LA CORBEILLE
    ===================================================== */
    public function index(Request $request)
    {
        $recherche = $request->query('recherche');

        $query = Corbeille::with('user:id,name')
            ->orderByDesc('created_at');

        if ($recherche) {
            $query->where(function ($q) use ($recherche) {
                $q->where('user_name', 'ILIKE', "%{$recherche}%")
                  ->orWhere('element_type', 'ILIKE', "%{$recherche}%")
                  ->orWhere('raison', 'ILIKE', "%{$recherche}%")
                  ->orWhereRaw(
                      "donnees::text ILIKE ?",
                      ["%{$recherche}%"]
                  );
            });
        }

        return response()->json($query->get());
    }

    /* =====================================================
       DÉTAIL D'UN ÉLÉMENT
    ===================================================== */
    public function show($id)
    {
        return response()->json(
            Corbeille::with('user:id,name')->findOrFail($id)
        );
    }

    /* =====================================================
       ❌ PAS DE SUPPRESSION DÉFINITIVE (vidage interdit)
       On expose volontairement aucun endpoint DELETE.
    ===================================================== */
}