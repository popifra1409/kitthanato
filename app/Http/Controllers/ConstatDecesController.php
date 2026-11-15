<?php

namespace App\Http\Controllers;

use App\Models\ConstatDeces;
use App\Models\Depot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ConstatDecesController extends Controller
{
    /* =========================================================
       CONSTANTE MÉTIER
       ========================================================= */
    private const LIEU_INTERNE = 'Hôpital Général de Yaoundé';

    /* =========================================================
       LISTE
       GET /api/constat-deces
    ========================================================= */

public function getByDepot($depotId)
{
    $constat = ConstatDeces::where('depot_id', $depotId)
        ->first();

    return response()->json([
        'constat' => $constat
    ]);
}

    public function index(Request $request)
    {
        $query = ConstatDeces::with([
            'depot',
            'createur',
            'modificateur',
        ])->orderByDesc('created_at');

        if ($request->filled('depot_id')) {
            $query->where('depot_id', $request->query('depot_id'));
        }

        if ($request->filled('recherche')) {
            $t = '%' . $request->query('recherche') . '%';
            $query->where(function ($q) use ($t) {
                $q->where('reference', 'like', $t)
                  ->orWhere('nom', 'like', $t)
                  ->orWhere('prenom', 'like', $t);
            });
        }

        return response()->json($query->get());
    }

    /* =========================================================
       AFFICHER
       GET /api/constat-deces/{id}
    ========================================================= */

    public function show($id)
    {
        $constat = ConstatDeces::with([
            'depot',
            'createur',
            'modificateur',
        ])->find($id);

        if (!$constat) {
            return response()->json(
                ['message' => 'Constat de décès introuvable.'],
                404
            );
        }

        return response()->json($constat);
    }

    /* =========================================================
       PRÉ-REMPLISSAGE
       GET /api/depots/{id}/constat-prefill
       → Renvoie les données du dépôt prêtes à remplir le constat.
       → Lieu de décès :
         * provenance interne → "Hôpital Général de Yaoundé"
         * provenance externe → lieu_provenance
         * sinon → lieu_provenance ou emplacement
    ========================================================= */

    public function prefill($depotId)
    {
        $depot = Depot::find($depotId);

        if (!$depot) {
            return response()->json(
                ['message' => 'Dépôt introuvable.'],
                404
            );
        }

        /* --- Détermination du lieu de décès --- */
        $provenance = strtolower(trim((string) $depot->provenance));

        if ($provenance === 'interne' || $provenance === 'interné') {
            $lieuDeces = self::LIEU_INTERNE;
        } elseif ($provenance === 'externe') {
            $lieuDeces = $depot->lieu_provenance ?: '';
        } else {
            $lieuDeces = $depot->lieu_provenance ?: ($depot->emplacement ?: '');
        }

        /* --- Sexe normalisé en M/F --- */
        $sexe = '';
        if ($depot->sexe === 'Masculin') {
            $sexe = 'M';
        } elseif ($depot->sexe === 'Féminin') {
            $sexe = 'F';
        }

        return response()->json([
            'depot_id'        => $depot->id,
            'code_defunt'     => $depot->code_defunt,

            'nom'             => $depot->nom,
            'prenom'          => $depot->prenom,
            'sexe'            => $sexe,
            'date_naissance'  => optional($depot->date_naissance)->format('Y-m-d'),
            'age'             => $depot->age,
            'lieu_deces'      => $lieuDeces,

            'date_deces'      => optional($depot->date_deces)->format('Y-m-d'),
            'heure_deces'     => $depot->heure_deces
                                    ? substr((string) $depot->heure_deces, 0, 5)
                                    : null,
        ]);
    }

    /* =========================================================
       CRÉER
       POST /api/constat-deces
    ========================================================= */

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'depot_id' => ['required', 'exists:depots,id'],

            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['nullable', 'string', 'max:100'],
            'sexe' => ['nullable', 'in:M,F,Masculin,Féminin'],
            'date_naissance' => ['nullable', 'date'],
            'age' => ['nullable', 'integer', 'min:0', 'max:150'],
            'lieu_deces' => ['nullable', 'string', 'max:255'],

            'date_deces' => ['required', 'date', 'before_or_equal:today'],
            'heure_deces' => ['nullable', 'date_format:H:i'],

            'praticien' => ['required', 'string', 'max:150'],
            'date_constat' => ['nullable', 'date', 'before_or_equal:today'],
            'heure_constat' => ['nullable', 'date_format:H:i'],

            'circonstance_1' => ['nullable', 'string', 'max:500'],
            'circonstance_2' => ['nullable', 'string', 'max:500'],
            'circonstance_3' => ['nullable', 'string', 'max:500'],

            'obstacle_medico_legal' => ['nullable', 'in:oui,non'],

            'fait_a' => ['nullable', 'string', 'max:100'],
            'fait_le' => ['nullable', 'date'],
            'fait_heure' => ['nullable', 'date_format:H:i'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        /* Un seul constat par dépôt */
        $existe = ConstatDeces::where('depot_id', $data['depot_id'])->first();
        if ($existe) {
            return response()->json([
                'message' => 'Un constat de décès existe déjà pour ce dépôt.',
                'constat' => $existe,
            ], 409);
        }

        /* ✅ Si le front n'a pas envoyé lieu_deces, on le calcule
           selon la provenance du dépôt (source de vérité). */
        if (empty($data['lieu_deces'])) {
            $depot = Depot::find($data['depot_id']);
            $provenance = strtolower(trim((string) $depot->provenance));

            if ($provenance === 'interne' || $provenance === 'interné') {
                $data['lieu_deces'] = self::LIEU_INTERNE;
            } elseif ($provenance === 'externe') {
                $data['lieu_deces'] = $depot->lieu_provenance ?: '';
            } else {
                $data['lieu_deces'] = $depot->lieu_provenance
                    ?: ($depot->emplacement ?: '');
            }
        }

        $constat = DB::transaction(function () use ($data, $request) {
            $data['reference'] = ConstatDeces::genererReference();
            $data['createur_id'] = $request->user()?->id;

            /* Normalise le sexe en M/F */
            if (!empty($data['sexe'])) {
                $data['sexe'] = in_array($data['sexe'], ['Masculin', 'M'])
                    ? 'M'
                    : 'F';
            }

            return ConstatDeces::create($data);
        });

        return response()->json([
            'message' => 'Constat de décès enregistré avec succès.',
            'constat' => $constat->load(['depot', 'createur']),
        ], 201);
    }

    /* =========================================================
       MODIFIER
       PUT /api/constat-deces/{id}
    ========================================================= */

    public function update(Request $request, $id)
    {
        $constat = ConstatDeces::find($id);

        if (!$constat) {
            return response()->json(
                ['message' => 'Constat de décès introuvable.'],
                404
            );
        }

        $validator = Validator::make($request->all(), [
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['nullable', 'string', 'max:100'],
            'sexe' => ['nullable', 'in:M,F,Masculin,Féminin'],
            'date_naissance' => ['nullable', 'date'],
            'age' => ['nullable', 'integer', 'min:0', 'max:150'],
            'lieu_deces' => ['nullable', 'string', 'max:255'],

            'date_deces' => ['required', 'date'],
            'heure_deces' => ['nullable', 'date_format:H:i'],

            'praticien' => ['required', 'string', 'max:150'],
            'date_constat' => ['nullable', 'date'],
            'heure_constat' => ['nullable', 'date_format:H:i'],

            'circonstance_1' => ['nullable', 'string', 'max:500'],
            'circonstance_2' => ['nullable', 'string', 'max:500'],
            'circonstance_3' => ['nullable', 'string', 'max:500'],

            'obstacle_medico_legal' => ['nullable', 'in:oui,non'],

            'fait_a' => ['nullable', 'string', 'max:100'],
            'fait_le' => ['nullable', 'date'],
            'fait_heure' => ['nullable', 'date_format:H:i'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (!empty($data['sexe'])) {
            $data['sexe'] = in_array($data['sexe'], ['Masculin', 'M'])
                ? 'M'
                : 'F';
        }

        $data['modificateur_id'] = $request->user()?->id;

        $constat->update($data);

        return response()->json([
            'message' => 'Constat de décès modifié avec succès.',
            'constat' => $constat->fresh()->load([
                'depot',
                'createur',
                'modificateur',
            ]),
        ]);
    }

    /* =========================================================
       SUPPRIMER
       DELETE /api/constat-deces/{id}
    ========================================================= */

    public function destroy($id)
    {
        $constat = ConstatDeces::find($id);

        if (!$constat) {
            return response()->json(
                ['message' => 'Constat de décès introuvable.'],
                404
            );
        }

        $constat->delete();

        return response()->json([
            'message' => 'Constat de décès supprimé.',
        ]);
    }
}