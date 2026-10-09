<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Prestation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DepotController extends Controller
{
    /**
     * ============================================================
     * LISTE DES DÉPÔTS
     * GET /api/depots
     * ============================================================
     */
    public function index()
    {
        $depots = Depot::with([
            'sorties',
            'transferts',
            'prestations'
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        $depots->each(function ($depot) {

            /* =========================================================
               1. Chercher une sortie PAYÉE
               ========================================================= */
            $sortiePayee = $depot->sorties->first(function ($sortie) {
                return (float) $sortie->montant_paye > 0;
            });

            /* =========================================================
               2. Chercher un transfert EXTERNE
               ========================================================= */
            $transfertExterne = $depot->transferts->first(function ($transfert) {
                return strtolower($transfert->type) === 'externe';
            });

            /* =========================================================
               3. Déterminer le statut
               Priorité : SORTI > TRANSFÉRÉ > PRÉSENT
               ========================================================= */
            if ($sortiePayee) {
                // Une sortie a été payée → SORTI
                $depot->statut = 'SORTI';
            } elseif ($transfertExterne) {
                // Transfert externe → TRANSFÉRÉ
                $depot->statut = 'TRANSFÉRÉ';
            } else {
                // Aucune sortie payée, aucun transfert externe
                // (y compris s'il y a un transfert interne → PRÉSENT)
                $depot->statut = 'PRÉSENT';
            }
        });

        return response()->json($depots);
    }


    /**
     * ============================================================
     * ENREGISTRER UN NOUVEAU DÉPÔT
     * POST /api/depots
     * ============================================================
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [

            'code' => ['required', 'string', 'regex:/^[0-9]{2}PA[0-9]+$/'],

            'code_defunt' => [
                'nullable',
                'string',
                'max:50',
                'unique:depots,code_defunt'
            ],

            'nom' => 'required|string|max:100',

            'prenom' => 'required|string|max:100',

            'sexe' => 'required|string|max:20',

            'prestations' => 'nullable|array',

            'prestations.*' => 'exists:prestations,id',

            'montant_prestations' => 'nullable|numeric|min:0',

            'date_naissance' => [
                'nullable',
                'date',
                'required_without:age'
            ],

            'age' => [
                'nullable',
                'integer',
                'min:0',
                'max:150',
                'required_without:date_naissance'
            ],

            'profession' => 'nullable|string|max:150',

            'date_deces' => [
                'required',
                'date',
                'before_or_equal:today'
            ],

            'heure_deces' => 'nullable|date_format:H:i',

            'date_arrivee' => [
                'required',
                'date',
                'before_or_equal:today'
            ],

            'heure_arrivee' => [
                'required',
                'date_format:H:i'
            ],

            'date_sortie' => 'nullable|date',

            'provenance' => 'required|string|max:50',

            'service_origine' => 'nullable|string|max:150',

            'lieu_provenance' => 'nullable|string|max:200',

            'motif' => 'required|string|max:100',

            'etat' => 'nullable|string|max:150',

            'emplacement' => 'required|string|max:100',

            'chapelle' => 'required|string|max:100',

            'contact_nom' => 'required|string|max:150',

            'contact_telephone' => 'required|string|max:30',

            'contact_cni' => ['nullable', 'string', 'max:50'],

            'lien_parente' => 'nullable|string|max:100',

        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        /*
         * ========================================================
         * CALCUL AUTOMATIQUE DE L'ÂGE
         * ========================================================
         */
        $age = $data['age'] ?? null;

        if (!empty($data['date_naissance'])) {
            $dateNaissance = new \DateTime($data['date_naissance']);
            $aujourdHui = new \DateTime();

            $age = $aujourdHui->diff($dateNaissance)->y;
        }

        /*
         * ========================================================
         * CRÉATION DU DÉPÔT
         * ========================================================
         */
        $depot = Depot::create([

            'code' => strtoupper(trim($data['code'])),

            'code_defunt' => $data['code_defunt'] ?? null,

            'nom' => trim($data['nom']),

            'prenom' => trim($data['prenom']),

            'sexe' => $data['sexe'],

            'date_naissance' => $data['date_naissance'] ?? null,

            'age' => $age,

            'profession' => $data['profession'] ?? null,

            'date_deces' => $data['date_deces'],

            'heure_deces' => $data['heure_deces'] ?? null,

            'date_arrivee' => $data['date_arrivee'],

            'heure_arrivee' => $data['heure_arrivee'],

            'date_sortie' => $data['date_sortie'] ?? null,

            'provenance' => $data['provenance'],

            'service_origine' => $data['service_origine'] ?? null,

            'lieu_provenance' => $data['lieu_provenance'] ?? null,

            'motif' => $data['motif'],

            'etat' => $data['etat'] ?? null,

            'emplacement' => $data['emplacement'],

            'chapelle' => $data['chapelle'],

            'contact_nom' => $data['contact_nom'],

            'contact_telephone' => $data['contact_telephone'],

            'contact_cni' => $data['contact_cni'] ?? null,

            'lien_parente' => $data['lien_parente'] ?? null,

            'prestations' => $data['prestations'] ?? [],

            'montant_prestations' => $data['montant_prestations'] ?? 0,

            'statut' => 'PRÉSENT',
        ]);

        /*
         * ========================================================
         * ASSOCIATION DES PRESTATIONS
         * ========================================================
         */
        if (!empty($data['prestations'])) {

            $prestations = Prestation::whereIn(
                'id',
                $data['prestations']
            )->get();

            $prestationsAvecPrix = [];

            foreach ($prestations as $prestation) {
                $prestationsAvecPrix[$prestation->id] = [
                    'prix' => $prestation->prix
                ];
            }

            $depot->prestations()->sync($prestationsAvecPrix);
        }

        /*
         * ========================================================
         * RECHARGER LES RELATIONS
         * ========================================================
         */
        $depot->load('prestations');

        return response()->json([
            'message' => 'Dépôt enregistré avec succès.',
            'depot' => $depot
        ], 201);
    }


    /**
     * ============================================================
     * AFFICHER UN DÉPÔT
     * GET /api/depots/{id}
     * ============================================================
     */
    public function show($id)
    {
        $depot = Depot::with([
            'prestations',
            'sorties',
            'transferts'
        ])->find($id);

        if (!$depot) {
            return response()->json([
                'message' => 'Dépôt introuvable.'
            ], 404);
        }

        return response()->json($depot);
    }


    /**
     * ============================================================
     * MODIFIER UN DÉPÔT
     * PUT /api/depots/{id}
     * ============================================================
     */
    public function update(Request $request, $id)
    {
        $depot = Depot::find($id);

        if (!$depot) {
            return response()->json([
                'message' => 'Dépôt introuvable.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [

            'code' => ['required', 'string', 'regex:/^[0-9]{2}PA[0-9]+$/'],

            'code_defunt' => [
                'nullable',
                'string',
                'max:50',
                'unique:depots,code_defunt,' . $id
            ],

            'nom' => 'required|string|max:100',

            'prenom' => 'required|string|max:100',

            'sexe' => 'required|string|max:20',

            'prestations' => 'nullable|array',

            'prestations.*' => 'exists:prestations,id',

            'montant_prestations' => 'nullable|numeric|min:0',

            'date_naissance' => 'nullable|date',

            'age' => 'nullable|integer|min:0|max:150',

            'profession' => 'nullable|string|max:150',

            'date_deces' => 'required|date',

            'heure_deces' => 'nullable|date_format:H:i',

            'date_arrivee' => 'required|date',

            'heure_arrivee' => 'required|date_format:H:i',

            'date_sortie' => 'nullable|date',

            'provenance' => 'required|string|max:50',

            'service_origine' => 'nullable|string|max:150',

            'lieu_provenance' => 'nullable|string|max:200',

            'motif' => 'required|string|max:100',

            'etat' => 'nullable|string|max:150',

            'emplacement' => 'required|string|max:100',

            'chapelle' => 'required|string|max:100',

            'contact_nom' => 'required|string|max:150',

            'contact_telephone' => 'required|string|max:30',

            'contact_cni' => ['nullable', 'string', 'max:50'],

            'lien_parente' => 'nullable|string|max:100',

        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        /*
         * ========================================================
         * CALCUL DE L'ÂGE
         * ========================================================
         */
        $age = $data['age'] ?? null;

        if (!empty($data['date_naissance'])) {
            $dateNaissance = new \DateTime($data['date_naissance']);
            $aujourdHui = new \DateTime();

            $age = $aujourdHui->diff($dateNaissance)->y;
        }

        /*
         * ========================================================
         * MODIFICATION
         * ========================================================
         */
        $depot->update([

            'code' => strtoupper(trim($data['code'])),

            'code_defunt' => $data['code_defunt'] ?? null,

            'nom' => trim($data['nom']),

            'prenom' => trim($data['prenom']),

            'sexe' => $data['sexe'],

            'date_naissance' => $data['date_naissance'] ?? null,

            'age' => $age,

            'profession' => $data['profession'] ?? null,

            'date_deces' => $data['date_deces'],

            'heure_deces' => $data['heure_deces'] ?? null,

            'date_arrivee' => $data['date_arrivee'],

            'heure_arrivee' => $data['heure_arrivee'],

            'date_sortie' => $data['date_sortie'] ?? null,

            'provenance' => $data['provenance'],

            'service_origine' => $data['service_origine'] ?? null,

            'lieu_provenance' => $data['lieu_provenance'] ?? null,

            'motif' => $data['motif'],

            'etat' => $data['etat'] ?? null,

            'emplacement' => $data['emplacement'],

            'chapelle' => $data['chapelle'],

            'contact_nom' => $data['contact_nom'],

            'contact_telephone' => $data['contact_telephone'],

            'contact_cni' => $data['contact_cni'],

            'lien_parente' => $data['lien_parente'] ?? null,

            'prestations' => $data['prestations'] ?? [],

            'montant_prestations' => $data['montant_prestations'] ?? 0,
        ]);

        /*
         * ========================================================
         * MISE À JOUR DES PRESTATIONS
         * ========================================================
         */
        if (array_key_exists('prestations', $data)) {

            $prestations = Prestation::whereIn(
                'id',
                $data['prestations'] ?? []
            )->get();

            $prestationsAvecPrix = [];

            foreach ($prestations as $prestation) {
                $prestationsAvecPrix[$prestation->id] = [
                    'prix' => $prestation->prix
                ];
            }

            $depot->prestations()->sync($prestationsAvecPrix);
        }

        $depot->load('prestations');

        return response()->json([
            'message' => 'Dépôt modifié avec succès.',
            'depot' => $depot
        ]);
    }


    /**
     * ============================================================
     * SUPPRIMER UN DÉPÔT
     * DELETE /api/depots/{id}
     * ============================================================
     */
    public function destroy(Request $request, $id)
    {
        $depot = Depot::findOrFail($id);

        $this->mettreEnCorbeille(
            'DEPOT',
            $depot->id,
            $depot->toArray(),
            $request->input('raison')
        );

        $depot->delete();

        return response()->json([
            'message' => 'Dépôt supprimé.',
        ]);
    }


    /**
     * ============================================================
     * DÉPÔTS DISPONIBLES POUR UNE SORTIE
     * GET /api/depots-disponibles
     * ============================================================
     */
    public function depotsDisponibles()
    {
        try {

            $depots = Depot::whereNull('date_sortie')
                ->orderBy('created_at', 'desc')
                ->get([
                    'id',
                    'code',
                    'code_defunt',
                    'nom',
                    'prenom',
                    'sexe',
                    'date_naissance',
                    'age',
                    'date_deces',
                    'heure_deces',
                    'date_arrivee',
                    'heure_arrivee',
                    'provenance',
                    'service_origine',
                    'lieu_provenance',
                    'motif',
                    'etat',
                    'emplacement',
                    'chapelle',
                    'contact_nom',
                    'contact_telephone',
                    'contact_cni',
                    'lien_parente',
                ]);

            return response()->json([
                'depots' => $depots
            ], 200);

        } catch (\Throwable $e) {

            return response()->json([
                'message' => 'Erreur lors de la récupération des dépôts disponibles.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}