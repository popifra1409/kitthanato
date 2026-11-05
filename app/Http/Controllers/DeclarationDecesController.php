<?php

namespace App\Http\Controllers;

use App\Models\DeclarationDeces;
use App\Models\Depot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeclarationDecesController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | LISTE DES DÉCLARATIONS
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $query = DeclarationDeces::with(['depot', ...DeclarationDeces::TRACE])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {

            $search = $request->search;

            $query->where(function ($q) use ($search) {

                $q->where(
                    'numero_declaration',
                    'ILIKE',
                    "%{$search}%"
                )

                ->orWhere(
                    'nom',
                    'ILIKE',
                    "%{$search}%"
                )

                ->orWhere(
                    'prenom',
                    'ILIKE',
                    "%{$search}%"
                )

                ->orWhere(
                    'declarant_nom',
                    'ILIKE',
                    "%{$search}%"
                );
            });
        }

        if ($request->filled('statut')) {
            $query->where(
                'statut',
                $request->statut
            );
        }

        return response()->json(
            $query->get()
        );
    }


    /*
    |--------------------------------------------------------------------------
    | TABLEAU DE BORD
    |--------------------------------------------------------------------------
    */

    public function dashboard()
    {
        $debutAnnee = now()->startOfYear();

        $debutMois = now()->startOfMonth();

        return response()->json([

            'total' =>
                DeclarationDeces::count(),

            'cette_annee' =>
                DeclarationDeces::where(
                    'created_at',
                    '>=',
                    $debutAnnee
                )->count(),

            'ce_mois' =>
                DeclarationDeces::where(
                    'created_at',
                    '>=',
                    $debutMois
                )->count(),

            'enregistrees' =>
                DeclarationDeces::where(
                    'statut',
                    'ENREGISTRÉE'
                )->count(),

            'brouillons' =>
                DeclarationDeces::where(
                    'statut',
                    'BROUILLON'
                )->count(),
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | DÉFUNTS DISPONIBLES
    |--------------------------------------------------------------------------
    */

    public function defunts()
    {
        $depots = Depot::query()
            ->orderBy('nom')
            ->orderBy('prenom')
            ->get();

        return response()->json(
            $depots
        );
    }


    /*
    |--------------------------------------------------------------------------
    | INFORMATIONS D'UN DÉFUNT
    |--------------------------------------------------------------------------
    */

    public function depot($id)
    {
        $depot = Depot::findOrFail($id);

        return response()->json(
            $depot
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GÉNÉRATION NUMÉRO
    |--------------------------------------------------------------------------
    */

    private function genererNumero()
    {
        $annee = now()->year;

        $dernier = DeclarationDeces::whereYear(
            'created_at',
            $annee
        )
        ->orderByDesc('id')
        ->first();

        $ordre = $dernier
            ? ((int) preg_replace(
                '/\D/',
                '',
                substr(
                    $dernier->numero_declaration,
                    0,
                    10
                )
            ) + 1)
            : 1;

        return str_pad(
            $ordre,
            4,
            '0',
            STR_PAD_LEFT
        ) . '/' . $annee;
    }


    /*
    |--------------------------------------------------------------------------
    | ENREGISTRER UNE DÉCLARATION
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {

    $depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $validated = $request->validate([

            'depot_id' =>
                'required|exists:depots,id',

            'nom' =>
                'nullable|string|max:255',

            'prenom' =>
                'nullable|string|max:255',

            'sexe' =>
                'nullable|string|max:30',

            'date_naissance' =>
                'nullable|date',

            'date_deces' =>
                'nullable|date',

            'heure_deces' =>
                'nullable',

            'declarant_nom' =>
                'nullable|string|max:255',

            'declarant_qualite' =>
                'nullable|string|max:255',

            'declarant_contact' =>
                'nullable|string|max:255',

            'statut' =>
                'nullable|string|max:50',
        ]);


        return DB::transaction(function () use (
            $request,
            $validated
        ) {

            $depot = Depot::findOrFail(
                $validated['depot_id']
            );

            /*
             * Informations automatiquement reprises
             * depuis le dépôt.
             */

            $data = $request->except([
                'numero_declaration'
            ]);

            $data['depot_id'] =
                $depot->id;

            /*
             * On privilégie les données du dépôt
             * lorsque le formulaire ne les fournit pas.
             */

            $data['nom'] =
                $request->nom ??
                $depot->nom ??
                null;

            $data['prenom'] =
                $request->prenom ??
                $depot->prenom ??
                null;

            $data['sexe'] =
                $request->sexe ??
                $depot->sexe ??
                null;

            $data['date_naissance'] =
                $request->date_naissance ??
                $depot->date_naissance ??
                null;

            $data['profession'] =
                $request->profession ??
                $depot->profession ??
                null;

            $data['date_deces'] =
                $request->date_deces ??
                $depot->date_deces ??
                null;

            $data['heure_deces'] =
                $request->heure_deces ??
                $depot->heure_deces ??
                null;

            $data['lieu_deces'] =
                $request->lieu_deces ??
                $depot->lieu_deces ??
                null;

            $data['numero_declaration'] =
                $this->genererNumero();

            $data['statut'] =
                $request->statut ??
                'ENREGISTRÉE';

            $declaration =
                DeclarationDeces::create(
                    $data
                );

            return response()->json(
                $declaration->load('depot'),
                201
            );
        });
    }


    /*
    |--------------------------------------------------------------------------
    | AFFICHER
    |--------------------------------------------------------------------------
    */

    public function show($id)
    {
        return response()->json(
            DeclarationDeces::with(['depot', ...DeclarationDeces::TRACE])
                ->findOrFail($id)
        );
    }


    /*
    |--------------------------------------------------------------------------
    | MODIFIER
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        $id
    ) {
$depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $declaration =
            DeclarationDeces::findOrFail($id);

        $data = $request->all();

        /*
         * On ne permet pas de modifier
         * le numéro automatiquement généré.
         */

        unset(
            $data['numero_declaration'],
            $data['depot_id']
        );

        $declaration->update(
            $data
        );

        return response()->json(
            $declaration->fresh()->load('depot')
        );
    }


    /*
    |--------------------------------------------------------------------------
    | SUPPRIMER
    |--------------------------------------------------------------------------
    */

    public function destroy(Request $request, $id)
    {

    $depot = \App\Models\Depot::find($request->depot_id);
if ($depot && $depot->scelle) {
    return response()->json(['message' => 'Ce corps est scellé.'], 423);
}
        $declaration =
            DeclarationDeces::findOrFail($id);

        $this->mettreEnCorbeille(
            'DECLARATION',
            $declaration->id,
            $declaration->toArray(),
            $request->input('raison')
        );

        $declaration->delete();

        return response()->json([
            'message' =>
                'Déclaration supprimée avec succès.'
        ]);
    }
}