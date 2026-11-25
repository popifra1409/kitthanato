<?php

namespace App\Http\Controllers;

use App\Models\Etat;
use Illuminate\Http\Request;

class EtatController extends Controller
{
    public function index(Request $request)
    {
        $recherche = $request->query('recherche');

        $etats = Etat::query()
            ->when($recherche, function ($query) use ($recherche) {
                $query->where('nom', 'ILIKE', '%' . $recherche . '%');
            })
            ->orderBy('nom')
            ->get();

        return response()->json($etats);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:100'
        ]);

        $etat = Etat::firstOrCreate([
            'nom' => trim($request->nom)
        ]);

        return response()->json($etat, 201);
    }
}