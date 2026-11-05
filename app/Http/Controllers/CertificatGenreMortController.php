<?php

namespace App\Http\Controllers;

use App\Models\CertificatGenreMort;
use App\Models\NomCertificat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CertificatGenreMortController extends Controller
{
    public function noms()
    {
        return response()->json(
            NomCertificat::orderBy('nom')->get()
        );
    }

    public function ajouterNom(Request $request)
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['soussigne', 'constat'])],
        ]);

        $nom = NomCertificat::firstOrCreate([
            'nom' => trim($validated['nom']),
            'type' => $validated['type'],
        ]);

        return response()->json($nom, 201);
    }

    public function show($depotId)
    {
        $depot = DB::table('depots')->find($depotId);

        if (!$depot) {
            return response()->json([
                'message' => 'Dépôt introuvable.',
            ], 404);
        }

        $certificat = CertificatGenreMort::where(
            'depot_id',
            $depotId
        )->first();

        return response()->json([
            'depot' => $depot,
            'certificat' => $certificat,
        ]);
    }

    public function store(Request $request)
    {

    $depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $validated = $request->validate([
            'depot_id' => [
                'required',
                'integer',
                'exists:depots,id',
            ],
            'donnees' => ['required', 'array'],
            'genres' => ['nullable', 'array'],
        ]);

        $certificat = CertificatGenreMort::updateOrCreate(
            ['depot_id' => $validated['depot_id']],
            [
                'donnees' => $validated['donnees'],
                'genres' => $validated['genres'] ?? [],
            ]
        );

        return response()->json([
            'message' => 'Certificat enregistré avec succès.',
            'certificat' => $certificat,
        ], 201);
    }

    public function update(Request $request, $id)
    {
       
    $depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
    $certificat = CertificatGenreMort::findOrFail($id);

        $validated = $request->validate([
            'donnees' => ['required', 'array'],
            'genres' => ['nullable', 'array'],
        ]);

        $certificat->update([
            'donnees' => $validated['donnees'],
            'genres' => $validated['genres'] ?? [],
        ]);

        return response()->json([
            'message' => 'Certificat modifié avec succès.',
            'certificat' => $certificat,
        ]);
    }
}