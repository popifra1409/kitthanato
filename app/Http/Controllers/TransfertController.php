<?php

namespace App\Http\Controllers;

use App\Models\Caisson;
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
                $caisson = !empty($validated['caisson_id'])
                    ? $this->caissonDestination((int) $validated['caisson_id'], $depot)
                    : null;

                if (!$caisson && empty($validated['emplacement_destination'])) {
                    throw ValidationException::withMessages([
                        'emplacement_destination' =>
                            'Le nouvel emplacement est obligatoire pour un transfert interne.',
                    ]);
                }

                $emplacement = $caisson
                    ? $this->libelleEmplacement($caisson)
                    : trim($validated['emplacement_destination']);

                $payload['emplacement_destination'] = $emplacement;
                $payload['destination'] = null;

                /* Mettre à jour l'emplacement du dépôt et son caisson */
                $depot->update([
                    'emplacement' => $emplacement,
                    'caisson_id'  => $caisson?->id,
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

                $caisson = !empty($validated['caisson_id'])
                    ? $this->caissonDestination((int) $validated['caisson_id'], $depot)
                    : null;

                if (!$caisson && empty($validated['emplacement_destination'])) {
                    throw ValidationException::withMessages([
                        'emplacement_destination' =>
                            'Le nouvel emplacement est obligatoire pour un transfert interne.',
                    ]);
                }

                $emplacement = $caisson
                    ? $this->libelleEmplacement($caisson)
                    : trim($validated['emplacement_destination']);

                $payload['emplacement_destination'] = $emplacement;
                $payload['destination'] = null;

                $depot->update([
                    'emplacement' => $emplacement,
                    'caisson_id'  => $caisson?->id,
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
            'caisson_id'              => 'nullable|integer|exists:caissons,id',
            'destination'             => 'nullable|string|max:255',
            'statut'                  => 'nullable|in:EN ATTENTE,VALIDÉ',
        ];
    }

    /* =========================================================
       CAISSON DE DESTINATION
    ========================================================= */

    private function libelleEmplacement(Caisson $caisson): string
    {
        $nomChambre = $caisson->chambreFroide?->nom;

        return $nomChambre
            ? "{$nomChambre} · {$caisson->code}"
            : $caisson->code;
    }

    private function caissonDestination(int $caissonId, Depot $depot): Caisson
    {
        $caisson = Caisson::with('chambreFroide')->find($caissonId);

        if (!$caisson) {
            abort(response()->json([
                'message' => 'Caisson invalide.',
                'errors'  => ['caisson_id' => ['Le caisson sélectionné est introuvable.']],
            ], 422));
        }

        if (!$caisson->actif || !$caisson->chambreFroide?->actif) {
            abort(response()->json([
                'message' => "Le caisson {$caisson->code} est désactivé : il ne peut pas être attribué.",
                'errors'  => ['caisson_id' => ['Ce caisson est désactivé.']],
            ], 422));
        }

        if ($caisson->chambreFroide->type === 'individuelle') {
            $occupe = Depot::where('caisson_id', $caisson->id)
                ->whereKeyNot($depot->id)
                ->presents()
                ->exists();

            if ($occupe) {
                abort(response()->json([
                    'message' => "Le caisson {$caisson->code} est déjà occupé. Une chambre individuelle ne peut accueillir qu'un seul corps.",
                    'errors'  => ['caisson_id' => ['Ce caisson est déjà occupé.']],
                ], 422));
            }
        }

        return $caisson;
    }
}