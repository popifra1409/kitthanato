<?php

namespace App\Http\Controllers;

use App\Models\Prestation;
use Illuminate\Http\Request;

class PrestationController extends Controller
{
    public function index()
    {
        return response()->json(
            Prestation::where('actif', true)
                ->orderBy('nom')
                ->get()
        );
    }

    public function indexAdmin()
    {
        return response()->json(
            Prestation::orderBy('nom')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom' => [
                'required',
                'string',
                'max:150',
                'unique:prestations,nom',
            ],

            'prix' => [
                'required',
                'numeric',
                'min:0',
            ],
        ]);

        $prestation = Prestation::create([
            'nom' => trim($data['nom']),
            'prix' => $data['prix'],
            'actif' => true,
        ]);

        /*
        $this->audit(
            'PRESTATIONS',
            'AJOUT',
            "Ajout de la prestation {$prestation->nom}",
            $prestation->toArray()
        );
        */

        return response()->json(
            $prestation,
            201
        );
    }

    public function update(
        Request $request,
        $id
    ) {
        $prestation = Prestation::findOrFail($id);

        $data = $request->validate([
            'nom' => [
                'required',
                'string',
                'max:150',
                'unique:prestations,nom,' . $id,
            ],

            'prix' => [
                'required',
                'numeric',
                'min:0',
            ],

            'actif' => [
                'sometimes',
                'boolean',
            ],
        ]);

        $ancien = $prestation->toArray();

        $prestation->update([
            'nom' => trim($data['nom']),
            'prix' => $data['prix'],
            'actif' => $data['actif'] ?? true,
        ]);

        /*
        $this->audit(
            'PRESTATIONS',
            'MODIFICATION',
            "Modification de la prestation {$prestation->nom}",
            [
                'avant' => $ancien,
                'apres' => $prestation->toArray(),
            ]
        );
        */

        return response()->json($prestation);
    }

    public function destroy($id)
    {
        $prestation = Prestation::findOrFail($id);

        $nom = $prestation->nom;

        // On désactive au lieu de supprimer
        // pour conserver l'historique.
        $prestation->update([
            'actif' => false,
        ]);

        /*
        $this->audit(
            'PRESTATIONS',
            'DESACTIVATION',
            "Désactivation de la prestation {$nom}",
            [
                'prestation_id' => $id,
            ]
        );
        */

        return response()->json([
            'message' => 'Prestation désactivée avec succès.'
        ]);
    }
}