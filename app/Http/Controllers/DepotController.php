<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Prestation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DepotController extends Controller
{
    /* =========================================================
       GÉNÉRATION AUTOMATIQUE DU CODE DÉFUNT
       Format : 3 lettres du mois + 4 chiffres
       Exemple : NOV0001, NOV0002, ...
    ========================================================= */

    private const MOIS_COURTS = [
        1  => 'JAN',
        2  => 'FEV',
        3  => 'MAR',
        4  => 'AVR',
        5  => 'MAI',
        6  => 'JUI',
        7  => 'JUL',
        8  => 'AOU',
        9  => 'SEP',
        10 => 'OCT',
        11 => 'NOV',
        12 => 'DEC',
    ];

    /**
     * Génère le prochain code défunt du mois courant.
     * À appeler DANS une transaction avec lockForUpdate().
     */
    private function genererProchainCodeDefunt(): string
    {
        $prefixe = self::MOIS_COURTS[(int) now()->month];

        $dernier = Depot::query()
            ->where('code_defunt', 'like', "{$prefixe}%")
            ->orderByRaw('LENGTH(code_defunt) DESC, code_defunt DESC')
            ->lockForUpdate()
            ->first();

        $numero = 1;

        if ($dernier) {
            $suffixe = (int) substr($dernier->code_defunt, strlen($prefixe));
            $numero = $suffixe + 1;
        }

        return $prefixe . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }

    /* =========================================================
       CALCUL DU STATUT
    ========================================================= */

    private function statutCalcule(Depot $depot): string
    {
        $depot->loadMissing(['sorties', 'transferts']);

        $sortiePayee = $depot->sorties->first(
            fn ($s) => (float) $s->montant_paye > 0
        );
        if ($sortiePayee) {
            return 'SORTI';
        }

        $transfertExterne = $depot->transferts->first(
            fn ($t) => strtolower($t->type) === 'externe'
        );
        if ($transfertExterne) {
            return 'TRANSFÉRÉ';
        }

        return 'PRÉSENT';
    }

    /* =========================================================
       GARDE-FOU CENTRALISÉ : corps scellé
    ========================================================= */

    private function refuserSiScelle(?Depot $depot, string $action = "cette opération"): void
    {
        if ($depot && $depot->scelle) {
            abort(response()->json([
                'message' => "Ce corps est scellé. Seul l'administrateur peut le desceller. "
                           . "Impossible d'effectuer {$action}.",
            ], 423));
        }
    }

    /* =========================================================
       LISTE
    ========================================================= */

    public function index()
    {
        $depots = Depot::with([
            'sorties',
            'transferts',
            'prestations',
            'depositants',
            ...Depot::TRACE,
        ])
            ->orderBy('created_at', 'desc')
            ->get();

        $depots->each(function ($depot) {
            $sortiePayee = $depot->sorties->first(
                fn ($s) => (float) $s->montant_paye > 0
            );

            $transfertExterne = $depot->transferts->first(
                fn ($t) => strtolower($t->type) === 'externe'
            );

            if ($sortiePayee) {
                $depot->statut = 'SORTI';
            } elseif ($transfertExterne) {
                $depot->statut = 'TRANSFÉRÉ';
            } else {
                $depot->statut = 'PRÉSENT';
            }
        });

        return response()->json($depots);
    }

    /* =========================================================
       CRÉATION — code_defunt généré automatiquement
       (code reste saisi au format 26PA00015)
    ========================================================= */

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'regex:/^[0-9]{2}PA[0-9]+$/'],

            /* code_defunt : généré par le backend, on ignore ce que le client envoie */
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'sexe' => 'required|string|max:20',
            'prestations' => 'nullable|array',
            'prestations.*' => 'exists:prestations,id',
            'montant_prestations' => 'nullable|numeric|min:0',
            'date_naissance' => ['nullable', 'date', 'required_without:age'],
            'age' => ['nullable', 'integer', 'min:0', 'max:150', 'required_without:date_naissance'],
            'profession' => 'nullable|string|max:150',
            'date_deces' => ['required', 'date', 'before_or_equal:today'],
            'heure_deces' => 'nullable|date_format:H:i',
            'date_arrivee' => ['required', 'date', 'before_or_equal:today'],
            'heure_arrivee' => ['required', 'date_format:H:i'],
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
            'depositants' => ['required', 'array', 'min:1'],
            'depositants.*.nom' => ['required', 'string', 'max:150'],
            'depositants.*.telephone' => ['required', 'string', 'max:30'],
            'depositants.*.cni' => ['nullable', 'string', 'max:50'],
            'depositants.*.lien_parente' => ['nullable', 'string', 'max:100'],
            'depositants.*.statut' => ['required', 'in:principal,secondaire'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $principaux = collect($data['depositants'])
            ->where('statut', 'principal')
            ->count();

        if ($principaux !== 1) {
            return response()->json([
                'message' => 'Un seul déposant doit être désigné comme principal.',
            ], 422);
        }

        /* Calcul de l'âge */
        $age = $data['age'] ?? null;

        if (!empty($data['date_naissance'])) {
            $dateNaissance = new \DateTime($data['date_naissance']);
            $aujourdHui = new \DateTime();
            $age = $aujourdHui->diff($dateNaissance)->y;
        }

        /* Transaction pour sécuriser le compteur de code_defunt */
        $depot = DB::transaction(function () use ($data, $age) {

            $codeDefunt = $this->genererProchainCodeDefunt();

            $depot = Depot::create([
                'code' => strtoupper(trim($data['code'])),   // ✅ conservé tel quel (26PA00015)
                'code_defunt' => $codeDefunt,                // ✅ auto : NOV0001, NOV0002, ...
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

            foreach ($data['depositants'] as $deposant) {
                $depot->depositants()->create([
                    'nom' => trim($deposant['nom']),
                    'telephone' => trim($deposant['telephone']),
                    'cni' => $deposant['cni'] ?? null,
                    'lien_parente' => $deposant['lien_parente'] ?? null,
                    'statut' => $deposant['statut'],
                ]);
            }

            if (!empty($data['prestations'])) {
                $prestations = Prestation::whereIn('id', $data['prestations'])->get();
                $prestationsAvecPrix = [];
                foreach ($prestations as $prestation) {
                    $prestationsAvecPrix[$prestation->id] = ['prix' => $prestation->prix];
                }
                $depot->prestations()->sync($prestationsAvecPrix);
            }

            return $depot;
        });

        $depot->load(['prestations', 'depositants']);

        return response()->json([
            'message' => 'Dépôt enregistré avec succès.',
            'depot' => $depot,
        ], 201);
    }

    /* =========================================================
       AFFICHER UN DÉPÔT — lecture seule
    ========================================================= */

    public function show($id)
    {
        $depot = Depot::with([
            'prestations',
            'depositants',
            'sorties',
            'transferts',
            ...Depot::TRACE,
        ])->find($id);

        if (!$depot) {
            return response()->json(['message' => 'Dépôt introuvable.'], 404);
        }

        return response()->json($depot);
    }

    /* =========================================================
       MODIFIER — code_defunt non modifiable
    ========================================================= */

    public function update(Request $request, $id)
    {
        $depot = Depot::find($id);

        if (!$depot) {
            return response()->json(['message' => 'Dépôt introuvable.'], 404);
        }

        $this->refuserSiScelle($depot, "une modification");

        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'regex:/^[0-9]{2}PA[0-9]+$/'],
            /* code_defunt n'est PAS validé : il reste tel quel */
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
            'depositants' => ['required', 'array', 'min:1'],
            'depositants.*.nom' => ['required', 'string', 'max:150'],
            'depositants.*.telephone' => ['required', 'string', 'max:30'],
            'depositants.*.cni' => ['nullable', 'string', 'max:50'],
            'depositants.*.lien_parente' => ['nullable', 'string', 'max:100'],
            'depositants.*.statut' => ['required', 'in:principal,secondaire'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $principaux = collect($data['depositants'])
            ->where('statut', 'principal')
            ->count();

        if ($principaux !== 1) {
            return response()->json([
                'message' => 'Un seul déposant doit être désigné comme principal.',
            ], 422);
        }

        $age = $data['age'] ?? null;

        if (!empty($data['date_naissance'])) {
            $dateNaissance = new \DateTime($data['date_naissance']);
            $aujourdHui = new \DateTime();
            $age = $aujourdHui->diff($dateNaissance)->y;
        }

        /* ⚠️ On ne touche JAMAIS à code_defunt en modification */
        $depot->update([
            'code' => strtoupper(trim($data['code'])),
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
        ]);

        $depot->depositants()->delete();
        foreach ($data['depositants'] as $deposant) {
            $depot->depositants()->create([
                'nom' => trim($deposant['nom']),
                'telephone' => trim($deposant['telephone']),
                'cni' => $deposant['cni'] ?? null,
                'lien_parente' => $deposant['lien_parente'] ?? null,
                'statut' => $deposant['statut'],
            ]);
        }

        if (array_key_exists('prestations', $data)) {
            $prestations = Prestation::whereIn('id', $data['prestations'] ?? [])->get();
            $prestationsAvecPrix = [];
            foreach ($prestations as $prestation) {
                $prestationsAvecPrix[$prestation->id] = ['prix' => $prestation->prix];
            }
            $depot->prestations()->sync($prestationsAvecPrix);
        }

        $depot->load(['prestations', 'depositants']);

        return response()->json([
            'message' => 'Dépôt modifié avec succès.',
            'depot' => $depot,
        ]);
    }

    /* =========================================================
       ATTRIBUER UN BOX
    ========================================================= */

    public function assignBox(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'box_name' => ['required', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Nom du box invalide.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $depot = Depot::find($id);
        if (!$depot) {
            return response()->json(['message' => 'Dépôt introuvable.'], 404);
        }

        $this->refuserSiScelle($depot, "une attribution de box");

        $depot->box_name = trim($request->input('box_name'));
        $depot->save();

        return response()->json([
            'message' => 'Box attribué avec succès.',
            'depot' => $depot->load('depositants'),
        ]);
    }

    /* =========================================================
       SUPPRIMER
    ========================================================= */

    public function destroy(Request $request, $id)
    {
        $depot = Depot::findOrFail($id);

        $this->refuserSiScelle($depot, "une suppression");

        $this->mettreEnCorbeille(
            'DEPOT',
            $depot->id,
            $depot->toArray(),
            $request->input('raison')
        );

        $depot->delete();

        return response()->json(['message' => 'Dépôt supprimé.']);
    }

    /* =========================================================
       DÉPÔTS DISPONIBLES POUR UNE SORTIE
    ========================================================= */

    public function corpsDisponibles()
    {
        try {
            $depots = Depot::whereNull('date_sortie')
                ->where('scelle', false)
                ->orderBy('created_at', 'desc')
                ->get([
                    'id', 'code', 'code_defunt', 'nom', 'prenom', 'sexe',
                    'date_naissance', 'age', 'date_deces', 'heure_deces',
                    'date_arrivee', 'heure_arrivee', 'provenance',
                    'service_origine', 'lieu_provenance', 'motif', 'etat',
                    'emplacement', 'box_name', 'chapelle', 'contact_nom',
                    'contact_telephone', 'contact_cni', 'lien_parente',
                    'scelle',
                ]);

            return response()->json(['depots' => $depots], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des dépôts disponibles.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /* =========================================================
       SCELLER / DESCELLER
    ========================================================= */

    public function sceller($id)
    {
        $depot = Depot::find($id);
        if (!$depot) {
            return response()->json(['message' => 'Dépôt introuvable.'], 404);
        }
        if ($depot->scelle) {
            return response()->json(['message' => 'Ce corps est déjà scellé.'], 422);
        }
        if ($this->statutCalcule($depot) !== 'PRÉSENT') {
            return response()->json([
                'message' => 'Seul un corps présent peut être scellé.',
            ], 422);
        }

        $depot->scelle = true;
        $depot->scelle_par = auth()->id();
        $depot->scelle_le = now();
        $depot->save();

        return response()->json([
            'message' => 'Corps scellé avec succès.',
            'depot' => $depot->load(['depositants', 'scelleur', ...Depot::TRACE]),
        ]);
    }

    public function desceller($id)
    {
        $depot = Depot::find($id);
        if (!$depot) {
            return response()->json(['message' => 'Dépôt introuvable.'], 404);
        }
        if (!$depot->scelle) {
            return response()->json(['message' => "Ce corps n'est pas scellé."], 422);
        }

        $depot->scelle = false;
        $depot->scelle_par = null;
        $depot->scelle_le = null;
        $depot->save();

        return response()->json([
            'message' => 'Corps descellé avec succès.',
            'depot' => $depot->load(['depositants', 'scelleur', ...Depot::TRACE]),
        ]);
    }
}