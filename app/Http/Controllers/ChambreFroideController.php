<?php

namespace App\Http\Controllers;

use App\Models\Caisson;
use App\Models\ChambreFroide;
use App\Models\Depot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChambreFroideController extends Controller
{
    /** GET /api/chambres-froides — chambres et leurs caissons */
    public function index()
    {
        return response()->json(
            ChambreFroide::with('caissons')->orderBy('nom')->get()
        );
    }

    /**
     * GET /api/emplacements/plan
     * Plan d'occupation : chambres → caissons → corps présents,
     * plus la liste des corps présents non encore attribués.
     */
    public function plan()
    {
        $formaterCorps = fn (Depot $depot) => [
            'id' => $depot->id,
            'code' => $depot->code,
            'code_defunt' => $depot->code_defunt,
            'nom' => $depot->nom,
            'prenom' => $depot->prenom,
            'sexe' => $depot->sexe,
            'age' => $depot->age,
            'profession' => $depot->profession,
            'date_deces' => optional($depot->date_deces)->format('Y-m-d'),
            'date_arrivee' => optional($depot->date_arrivee)->format('Y-m-d'),
            'provenance' => $depot->provenance,
            'chapelle' => $depot->chapelle,
            'caisson_id' => $depot->caisson_id,
            'statut' => $depot->statut,
            'scelle' => (bool) $depot->scelle,
        ];

        $chambres = ChambreFroide::with([
            'caissons' => fn ($query) => $query->orderBy('position')->orderBy('code'),
            'caissons.depots' => fn ($query) => $query->presents()->orderBy('date_arrivee'),
        ])
            ->orderBy('nom')
            ->get()
            ->map(fn (ChambreFroide $chambre) => [
                'id' => $chambre->id,
                'nom' => $chambre->nom,
                'type' => $chambre->type,
                'actif' => $chambre->actif,
                'caissons' => $chambre->caissons
                    ->map(fn (Caisson $caisson) => [
                        'id' => $caisson->id,
                        'code' => $caisson->code,
                        'actif' => $caisson->actif,
                        'corps' => $caisson->depots->map($formaterCorps)->values(),
                    ])
                    ->values(),
            ])
            ->values();

        $nonAttribues = Depot::presents()
            ->whereNull('caisson_id')
            ->orderBy('date_arrivee')
            ->get([
                'id', 'code', 'code_defunt', 'nom', 'prenom', 'sexe', 'age',
                'profession', 'date_deces', 'date_arrivee', 'provenance',
                'chapelle', 'caisson_id', 'statut', 'scelle',
            ])
            ->map($formaterCorps)
            ->values();

        $tousCaissons = $chambres->flatMap(fn ($chambre) => $chambre['caissons']);

        return response()->json([
            'chambres' => $chambres,
            'non_attribues' => $nonAttribues,
            'totaux' => [
                'caissons' => $tousCaissons->count(),
                'occupes' => $tousCaissons
                    ->filter(fn ($caisson) => $caisson['corps']->isNotEmpty())
                    ->count(),
                'corps' => $tousCaissons->sum(
                    fn ($caisson) => $caisson['corps']->count()
                ),
                'non_attribues' => $nonAttribues->count(),
            ],
        ]);
    }

    /**
     * POST /api/chambres-froides
     * « nombre_caissons » génère automatiquement A1, A2, ... à la création.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:100|unique:chambres_froides,nom',
            'type' => ['required', Rule::in(array_keys(ChambreFroide::TYPES))],
            'description' => 'nullable|string|max:255',
            'nombre_caissons' => 'nullable|integer|min:0|max:100',
        ]);

        $chambre = DB::transaction(function () use ($validated) {
            $chambre = ChambreFroide::create([
                'nom' => $validated['nom'],
                'type' => $validated['type'],
                'description' => $validated['description'] ?? null,
                'actif' => true,
            ]);

            $nombre = (int) ($validated['nombre_caissons'] ?? 0);

            for ($i = 1; $i <= $nombre; $i++) {
                $chambre->caissons()->create([
                    'code' => 'A' . $i,
                    'position' => $i,
                    'actif' => true,
                ]);
            }

            return $chambre;
        });

        return response()->json($chambre->load('caissons'), 201);
    }

    /** PUT /api/chambres-froides/{chambreFroide} */
    public function update(Request $request, ChambreFroide $chambreFroide)
    {
        $validated = $request->validate([
            'nom' => [
                'required',
                'string',
                'max:100',
                Rule::unique('chambres_froides', 'nom')->ignore($chambreFroide->id),
            ],
            'type' => ['required', Rule::in(array_keys(ChambreFroide::TYPES))],
            'description' => 'nullable|string|max:255',
        ]);

        $chambreFroide->update($validated);

        return response()->json($chambreFroide->load('caissons'));
    }

    /** PUT /api/chambres-froides/{chambreFroide}/actif */
    public function toggleActif(ChambreFroide $chambreFroide)
    {
        $chambreFroide->update(['actif' => !$chambreFroide->actif]);

        return response()->json($chambreFroide);
    }

    /**
     * POST /api/chambres-froides/{chambreFroide}/caissons
     * Code vide → prochain code libre de la série A1, A2, ...
     */
    public function storeCaisson(Request $request, ChambreFroide $chambreFroide)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:20|regex:/^[A-Za-z0-9-]+$/',
        ]);

        $code = isset($validated['code']) && trim($validated['code']) !== ''
            ? mb_strtoupper(trim($validated['code']))
            : $this->prochainCode($chambreFroide);

        if ($chambreFroide->caissons()->where('code', $code)->exists()) {
            throw ValidationException::withMessages([
                'code' => "Le caisson {$code} existe déjà dans cette chambre.",
            ]);
        }

        $caisson = $chambreFroide->caissons()->create([
            'code' => $code,
            'position' => (int) $chambreFroide->caissons()->max('position') + 1,
            'actif' => true,
        ]);

        return response()->json($caisson, 201);
    }

    /**
     * PUT /api/chambres-froides/{chambreFroide}/caissons/ordre
     * Réordonne les caissons d'une chambre (plan d'occupation).
     */
    public function reordonnerCaissons(Request $request, ChambreFroide $chambreFroide)
    {
        $validated = $request->validate([
            'caissons' => 'required|array|min:1',
            'caissons.*' => 'required|integer|distinct|exists:caissons,id',
        ]);

        $attendus = $chambreFroide->caissons()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values()
            ->all();

        $fournis = collect($validated['caissons'])
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values()
            ->all();

        if ($attendus !== $fournis) {
            throw ValidationException::withMessages([
                'caissons' => 'La liste doit contenir exactement les caissons de cette chambre.',
            ]);
        }

        DB::transaction(function () use ($validated) {
            foreach (array_values($validated['caissons']) as $index => $id) {
                Caisson::whereKey($id)->update(['position' => $index + 1]);
            }
        });

        return response()->json($chambreFroide->load('caissons'));
    }

    /** PUT /api/caissons/{caisson} */
    public function updateCaisson(Request $request, Caisson $caisson)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20|regex:/^[A-Za-z0-9-]+$/',
            'actif' => 'sometimes|boolean',
        ]);

        $code = mb_strtoupper(trim($validated['code']));

        $dejaUtilise = Caisson::where('chambre_froide_id', $caisson->chambre_froide_id)
            ->where('code', $code)
            ->whereKeyNot($caisson->getKey())
            ->exists();

        if ($dejaUtilise) {
            throw ValidationException::withMessages([
                'code' => "Le caisson {$code} existe déjà dans cette chambre.",
            ]);
        }

        $caisson->update(array_filter([
            'code' => $code,
            'actif' => $validated['actif'] ?? null,
        ], fn ($valeur) => $valeur !== null));

        return response()->json($caisson);
    }

    /** PUT /api/caissons/{caisson}/actif */
    public function toggleCaissonActif(Caisson $caisson)
    {
        $caisson->update(['actif' => !$caisson->actif]);

        return response()->json($caisson);
    }

    /** Prochain code de la série A1, A2, ... */
    private function prochainCode(ChambreFroide $chambreFroide): string
    {
        $maximum = 0;

        foreach ($chambreFroide->caissons()->pluck('code') as $code) {
            if (preg_match('/^A(\d+)$/i', $code, $resultat)) {
                $maximum = max($maximum, (int) $resultat[1]);
            }
        }

        return 'A' . ($maximum + 1);
    }
}
