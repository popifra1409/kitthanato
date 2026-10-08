<?php

namespace App\Http\Controllers;

use App\Models\Profession;
use Illuminate\Http\Request;

class ProfessionController extends Controller
{
    // Récupérer les professions
    public function index(Request $request)
    {
        $recherche = $request->query('recherche');

        $professions = Profession::query()
            ->when($recherche, function ($query) use ($recherche) {
                $query->where('nom', 'ILIKE', '%' . $recherche . '%');
            })
            ->orderBy('nom')
            ->get();

        return response()->json($professions);
    }

    // Ajouter une profession
    public function store(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:100'
        ]);

        $profession = Profession::firstOrCreate([
            'nom' => trim($request->nom)
        ]);

        return response()->json($profession, 201);
    }
}