<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Transfert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransfertController extends Controller
{
    /* =========================================================
       LISTE DES TRANSFERTS
    ========================================================= */

    public function index()
    {
        return response()->json(
            Transfert::with(['depot', ...Transfert::TRACE])
                ->orderByDesc('date')
                ->orderByDesc('heure')
                ->get()
        );
    }

    /* =========================================================
       ENREGISTRER UN TRANSFERT
    ========================================================= */

    public function store(Request $request)
    {

    $depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $validated = $request->validate($this->rules());

        return DB::transaction(function () use ($validated) {

            $depot = Depot::findOrFail($validated['depot_id']);

            /* =================================================
               SAUVEGARDER LA PROVENANCE AVANT MODIFICATION
            ================================================= */
            $provenance = $depot->emplacement;

            /* =================================================
               CONSTRUIRE LE PAYLOAD SELON LE TYPE
            ================================================= */

            $payload = [
                'date'       => $validated['date'],
                'heure'      => $validated['heure'],
                'depot_id'   => $depot->id,
                'type'       => $validated['type'],
                'motif'      => trim($validated['motif']),
                'statut'     => $validated['statut'] ?? 'EN ATTENTE',
                'provenance' => $provenance,
            ];

            if ($validated['type'] === 'interne') {

                /* ---------- TRANSFERT INTERNE ---------- */
                if (empty($validated['emplacement_destination'])) {
                    throw ValidationException::withMessages([
                        'emplacement_destination' =>
                            'Le nouvel emplacement est obligatoire pour un transfert interne.',
                    ]);
                }

                $payload['emplacement_destination'] =
                    trim($validated['emplacement_destination']);
                $payload['destination'] = null;

                /* Mettre à jour l'emplacement du dépôt */
                $depot->update([
                    'emplacement' => $payload['emplacement_destination'],
                ]);

            } else {

                /* ---------- TRANSFERT EXTERNE ---------- */
                if (empty($validated['destination'])) {
                    throw ValidationException::withMessages([
                        'destination' =>
                            'La destination est obligatoire pour un transfert externe.',
                    ]);
                }

                $payload['destination'] = trim($validated['destination']);
                $payload['emplacement_destination'] = null;

                /* Le dépôt passe en TRANSFÉRÉ */
                $depot->update([
                    'statut' => 'TRANSFÉRÉ',
                ]);
            }

            /* =================================================
               CRÉER LE TRANSFERT
            ================================================= */

            $transfert = Transfert::create($payload);

            return response()->json(
                $transfert->load('depot'),
                201
            );
        });
    }

    /* =========================================================
       MODIFIER UN TRANSFERT
    ========================================================= */

    public function update(Request $request, Transfert $transfert)
    {

    $depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $validated = $request->validate($this->rules());

        return DB::transaction(function () use ($validated, $transfert) {

            $depot = Depot::findOrFail($validated['depot_id']);

            /* =================================================
               GARDER LA PROVENANCE ORIGINALE
               (ne pas l'écraser si déjà définie)
            ================================================= */
            $provenance = $transfert->provenance ?: $depot->emplacement;

            $payload = [
                'date'       => $validated['date'],
                'heure'      => $validated['heure'],
                'depot_id'   => $depot->id,
                'type'       => $validated['type'],
                'statut'     => $validated['statut'] ?? 'EN ATTENTE',
                'provenance' => $provenance,
            ];

            if ($validated['type'] === 'interne') {

                if (empty($validated['emplacement_destination'])) {
                    throw ValidationException::withMessages([
                        'emplacement_destination' =>
                            'Le nouvel emplacement est obligatoire pour un transfert interne.',
                    ]);
                }

                $payload['emplacement_destination'] =
                    trim($validated['emplacement_destination']);
                $payload['destination'] = null;

                $depot->update([
                    'emplacement' => $payload['emplacement_destination'],
                ]);

            } else {

                if (empty($validated['destination'])) {
                    throw ValidationException::withMessages([
                        'destination' =>
                            'La destination est obligatoire pour un transfert externe.',
                    ]);
                }

                $payload['destination'] = trim($validated['destination']);
                $payload['emplacement_destination'] = null;

                $depot->update([
                    'statut' => 'TRANSFÉRÉ',
                ]);
            }

            $transfert->update($payload);

            return response()->json(
                $transfert->fresh()->load('depot')
            );
        });
    }

    /* =========================================================
       SUPPRIMER UN TRANSFERT
    ========================================================= */

    public function destroy(Request $request, Transfert $transfert)
    {
 $depot = $transfert->depot;
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $this->mettreEnCorbeille(
            'TRANSFERT',
            $transfert->id,
            $transfert->toArray(),
            $request->input('raison')
        );

        $transfert->delete();

        return response()->json([
            'message' => 'Transfert supprimé.',
        ]);
    }

    /* =========================================================
       RÈGLES DE VALIDATION
    ========================================================= */

    private function rules(): array
    {
        return [
            'depot_id'                => 'required|exists:depots,id',
            'type'                    => 'required|in:interne,externe',
            'motif'                   => 'required|string|max:255',
            'date'                    => 'required|date',
            'heure'                   => 'required',
            'emplacement_destination' => 'nullable|string|max:255',
            'destination'             => 'nullable|string|max:255',
            'statut'                  => 'nullable|in:EN ATTENTE,VALIDÉ',
        ];
    }
}