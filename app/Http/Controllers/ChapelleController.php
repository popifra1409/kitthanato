<?php

namespace App\Http\Controllers;

use App\Models\Chapelle;
use Illuminate\Http\Request;

class ChapelleController extends Controller
{
    /** GET /api/chapelles — chapelles actives (formulaires) */
    public function index()
    {
        return response()->json(
            Chapelle::where('actif', true)->orderBy('nom')->get()
        );
    }

    /** GET /api/chapelles-admin — toutes les chapelles + traçabilité */
    public function indexAdmin()
    {
        return response()->json(
            Chapelle::with(Chapelle::TRACE)->orderBy('nom')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255|unique:chapelles,nom',
            'prix' => 'required|numeric|min:0',
            'actif' => 'boolean',
        ]);

        $chapelle = Chapelle::create($validated);

        return response()->json($chapelle, 201);
    }

    public function update(Request $request, Chapelle $chapelle)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255|unique:chapelles,nom,' . $chapelle->id,
            'prix' => 'required|numeric|min:0',
            'actif' => 'boolean',
        ]);

        $chapelle->update($validated);

        return response()->json($chapelle);
    }

    /**
     * DELETE /api/chapelles/{id}
     * Désactivation (comme les prestations) : les sorties passées gardent
     * leur référence et l'historique reste cohérent.
     */
    public function destroy(Chapelle $chapelle)
    {
        $chapelle->update(['actif' => false]);

        return response()->json([
            'message' => 'Chapelle désactivée.'
        ]);
    }
}
