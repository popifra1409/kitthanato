<?php

namespace App\Http\Controllers;

use App\Models\Sortie;
use App\Models\Depot;
use App\Models\Levee;
use App\Models\Prestation;
use App\Models\Chapelle;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SortieController extends Controller
{
    /* =========================================================
       LISTE DES SORTIES
    ========================================================= */

    public function index()
    {
        return response()->json(
            Sortie::with('depot')
                ->orderByDesc('date')
                ->orderByDesc('heure')
                ->get()
        );
    }

    /* =========================================================
       CORPS DISPONIBLES POUR SORTIE
    ========================================================= */

    public function corpsDisponibles()
    {
        return response()->json(
            Depot::whereIn('statut', ['PRÉSENT', 'PROGRAMMÉ'])
                ->orderBy('nom')
                ->get()
        );
    }

    /* =========================================================
       ENREGISTRER UNE SORTIE
    ========================================================= */

    public function store(Request $request)
    {
        $data = $request->validate([
            'depot_id' => ['required', 'exists:depots,id'],
            'date' => ['required', 'date'],
            'heure' => ['required'],
            'recuperateur' => ['nullable', 'string', 'max:255'],
            'prestations' => ['nullable', 'array'],
            'prestations.*' => ['integer', 'exists:prestations,id'],
            'chapelle_id' => ['nullable', 'exists:chapelles,id'],
        ]);

        return DB::transaction(function () use ($data) {

            $depot = Depot::findOrFail($data['depot_id']);

            /* Date d'arrivée du corps. */
            $dateArrivee = $depot->date_arrivee
                ? Carbon::parse($depot->date_arrivee)
                : Carbon::parse($data['date']);

            $dateSortie = Carbon::parse($data['date']);

            /* Même jour = 0 nuit. */
            $jours = max(
                0,
                $dateArrivee->diffInDays($dateSortie)
            );

            /* Tarif de la caisse. */
            $prixCaisse = $this->prixCaisse($depot->emplacement);
            $montantNuits = $jours * $prixCaisse;

            /* Prestations sélectionnées. */
            $prestationIds = $data['prestations'] ?? [];

            $prestations = Prestation::whereIn('id', $prestationIds)
                ->where('actif', true)
                ->get();

            $prestationsSnapshot = $prestations
                ->map(function ($prestation) {
                    return [
                        'id' => $prestation->id,
                        'nom' => $prestation->nom,
                        'prix' => (float) $prestation->prix,
                    ];
                })
                ->values()
                ->toArray();

            $montantPrestations = $prestations->sum(
                fn ($p) => (float) $p->prix
            );

            /* Chapelle. */
            $chapelle = null;
            $montantChapelle = 0;

            if (!empty($data['chapelle_id'])) {
                $chapelle = Chapelle::where('id', $data['chapelle_id'])
                    ->where('actif', true)
                    ->firstOrFail();

                $montantChapelle = (float) $chapelle->prix;
            }

            /* TOTAL. */
            $montantTotal =
                $montantPrestations +
                $montantNuits +
                $montantChapelle;

            /* Création de la sortie. */
            $sortie = Sortie::create([
                'depot_id' => $depot->id,
                'date' => $data['date'],
                'heure' => $data['heure'],
                'recuperateur' =>
                    $data['recuperateur'] ??
                    $depot->contact_nom ??
                    null,
                'statut' => 'EN COURS',
                'jours' => $jours,
                'caisse' => $depot->emplacement,
                'prestations' => $prestationsSnapshot,
                'montant_prestations' => $montantPrestations,
                'montant_nuits' => $montantNuits,
                'montant_chapelle' => $montantChapelle,
                'montant_total' => $montantTotal,
                'montant_paye' => 0,
                'reste_a_payer' => $montantTotal,
                'chapelle_id' => $chapelle?->id,
                'chapelle_nom' => $chapelle?->nom,
                'chapelle_prix' => $chapelle?->prix ?? 0,
            ]);

            
            $depot->update([
                'date_sortie' => $data['date'],
            ]);

            return response()->json(
                $sortie->load('depot'),
                201
            );
        });
    }

    /* =========================================================
       MODIFIER UNE SORTIE
    ========================================================= */

    public function update(Request $request, $id)
    {
        $sortie = Sortie::with('depot')->findOrFail($id);

        $data = $request->validate([
            'date' => ['required', 'date'],
            'heure' => ['required'],
            'recuperateur' => ['nullable', 'string', 'max:255'],
        ]);

        $sortie->update([
            'date' => $data['date'],
            'heure' => $data['heure'],
            'recuperateur' => $data['recuperateur'] ?? null,
        ]);

        return response()->json(
            $sortie->fresh()->load('depot')
        );
    }

    /* =========================================================
       ENREGISTRER UN PAIEMENT
    ========================================================= */

    public function paiement(Request $request, $id)
    {
        $sortie = Sortie::findOrFail($id);

        $data = $request->validate([
            'montant_paye' => ['required', 'numeric', 'min:0'],
        ]);

        /* Cumul du paiement */
        $dejaPaye = (float) $sortie->montant_paye;
        $nouveauPaiement = (float) $data['montant_paye'];

        $montantPaye = min(
            $dejaPaye + $nouveauPaiement,
            (float) $sortie->montant_total
        );

        $reste = max(
            0,
            (float) $sortie->montant_total - $montantPaye
        );

        /* Dès qu'un paiement est enregistré → VALIDÉ */
        $statut = $montantPaye > 0 ? 'VALIDÉ' : 'EN COURS';

        $sortie->update([
            'montant_paye' => $montantPaye,
            'reste_a_payer' => $reste,
            'statut' => $statut,
        ]);

        /* Créer la levée dès le premier paiement */
        Levee::updateOrCreate(
            ['sortie_id' => $sortie->id],
            [
                'date' => $sortie->date,
                'heure' => $sortie->heure,
                'chapelle' =>
                    $sortie->chapelle_nom ??
                    $sortie->chapelle ??
                    null,
                'statut' => 'PLANIFIÉ',
            ]
        );

        /* Le dépôt passe en SORTI dès le paiement */
        Depot::where('id', $sortie->depot_id)->update([
            'statut' => 'SORTI',
            'date_sortie' => $sortie->date,
        ]);

        return response()->json(
            $sortie->fresh()->load('depot')
        );
    }

    /* =========================================================
       SUPPRIMER UNE SORTIE
    ========================================================= */

    public function destroy($id)
    {
        $sortie = Sortie::findOrFail($id);

        $depotId = $sortie->depot_id;

        $sortie->delete();

        /* Le corps redevient disponible. */
        Depot::where('id', $depotId)->update([
            'statut' => 'PRÉSENT',
        ]);

        return response()->json([
            'message' => 'Sortie supprimée avec succès.',
        ]);
    }

    /* =========================================================
       TARIF CAISSE
    ========================================================= */

    private function prixCaisse(?string $emplacement): float
    {
        $emplacement = strtolower(trim($emplacement ?? ''));

        if (
            str_contains($emplacement, 'caisse 2') ||
            str_contains($emplacement, 'caisse moyenne')
        ) {
            return 20000;
        }

        /* Caisse 1 par défaut. */
        return 10000;
    }
}