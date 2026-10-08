<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Transfert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransfertController extends Controller
{
    public function index()
    {
        return response()->json(
            Transfert::with('depot')
                ->orderByDesc('date')
                ->orderByDesc('heure')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        return DB::transaction(function () use ($validated) {

            $transfert = Transfert::create($validated);

            if ($validated['type'] === 'interne'
                && !empty($validated['emplacement_destination'])) {

                Depot::where('id', $validated['depot_id'])
                    ->update(['emplacement' => $validated['emplacement_destination']]);
            }

            return response()->json($transfert->load('depot'), 201);
        });
    }

    public function update(Request $request, Transfert $transfert)
    {
        $validated = $request->validate($this->rules());

        return DB::transaction(function () use ($validated, $transfert) {

            $transfert->update($validated);

            if ($validated['type'] === 'interne'
                && !empty($validated['emplacement_destination'])) {

                Depot::where('id', $validated['depot_id'])
                    ->update(['emplacement' => $validated['emplacement_destination']]);
            }

            return response()->json($transfert->fresh()->load('depot'));
        });
    }

    public function destroy(Request $request, Transfert $transfert)
{
    $this->mettreEnCorbeille(
        'TRANSFERT',
        $transfert->id,
        $transfert->toArray(),
        $request->input('raison')
    );

    $transfert->delete();

    return response()->json([
        'message' => 'Transfert supprimé .',
    ]);
}

    private function rules(): array
    {
        return [
            'depot_id'                => 'required|exists:depots,id',
            'type'                    => 'required|in:interne,externe',
            'date'                    => 'required|date',
            'heure'                   => 'required',
            'emplacement_destination' => 'nullable|string|max:255',
            'destination'             => 'nullable|string|max:255',
            'statut'                  => 'required|in:EN ATTENTE,VALIDÉ',
        ];
    }
}