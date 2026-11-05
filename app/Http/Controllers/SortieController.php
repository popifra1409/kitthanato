<?php

namespace App\Http\Controllers;

use App\Models\Sortie;
use App\Models\Depot;
use App\Models\Levee;
use App\Models\Prestation;
use App\Models\Chapelle;
use App\Support\Audit;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SortieController extends Controller
{
    /* =========================================================
       LISTE DES SORTIES
    ========================================================= */

    public function index()
    {
        return response()->json(
            Sortie::with(['depot', ...Sortie::TRACE])
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
       VÉRIFICATION DISPONIBILITÉ CHAPELLE
    ========================================================= */

    private function verifierDisponibiliteChapelle(
        ?int $chapelleId,
        string $date,
        string $heure,
        int $dureeLevee,
        ?int $ignoreSortieId = null
    ): void {
        if (!$chapelleId) {
            return;
        }

        $heureNormalisee = strlen($heure) === 5 ? $heure . ':00' : $heure;

        try {
            $debut = Carbon::parse($date . ' ' . $heureNormalisee);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'heure' => ["Format de date/heure invalide : {$date} {$heureNormalisee}"],
            ]);
        }

        $fin = $debut->copy()->addMinutes($dureeLevee);

        $conflit = Sortie::query()
            ->where('chapelle_id', $chapelleId)
            ->when($ignoreSortieId, fn ($q) => $q->where('id', '!=', $ignoreSortieId))
            ->whereNotIn('statut', ['ANNULÉ', 'ANNULE', 'ANNULÉE', 'ANNULEE'])
            ->get()
            ->first(function (Sortie $s) use ($debut, $fin) {
                $sDebut = $s->debut;
                $sFin   = $s->fin;

                if (!$sDebut || !$sFin) return false;

                return $debut->lt($sFin) && $sDebut->lt($fin);
            });

        if ($conflit) {
            throw ValidationException::withMessages([
                'chapelle_id' => [
                    sprintf(
                        "La chapelle n'est pas libre sur ce créneau. Elle est déjà occupée de %s à %s.",
                        $conflit->debut_formate,
                        $conflit->fin_formate
                    ),
                ],
            ]);
        }
    }

    /* =========================================================
       ENREGISTRER UNE SORTIE
    ========================================================= */

    public function store(Request $request)
    {
        $data = $request->validate([
            'depot_id'      => ['required', 'exists:depots,id'],
            'date'          => ['required', 'date'],
            'heure'         => ['required', 'date_format:H:i'],
            'duree_levee'   => ['nullable', 'integer', 'min:15', 'max:480'],
            'recuperateur'  => ['nullable', 'string', 'max:255'],
            'prestations'   => ['nullable', 'array'],
            'prestations.*' => ['integer', 'exists:prestations,id'],
            'chapelle_id'   => ['nullable', 'exists:chapelles,id'],
        ]);

        $depot = Depot::find($data['depot_id']);

        if ($depot && $depot->scelle) {
            return response()->json(['message' => 'Ce corps est scellé.'], 423);
        }

        $dureeLevee = (int) ($data['duree_levee'] ?? 60);
        $this->verifierDisponibiliteChapelle(
            $data['chapelle_id'] ?? null,
            $data['date'],
            $data['heure'],
            $dureeLevee
        );

        return DB::transaction(function () use ($data, $dureeLevee) {

            $depot = Depot::findOrFail($data['depot_id']);

            $dateArrivee = $depot->date_arrivee
                ? Carbon::parse($depot->date_arrivee)
                : Carbon::parse($data['date']);

            $dateSortie = Carbon::parse($data['date']);

            $jours = max(
                0,
                (int) $dateArrivee->diffInDays($dateSortie)
            );

            $prixCaisse   = $this->prixCaisse($depot->emplacement);
            $montantNuits = $jours * $prixCaisse;

            $prestationIds = $data['prestations'] ?? [];

            $prestations = Prestation::whereIn('id', $prestationIds)
                ->where('actif', true)
                ->get();

            $prestationsSnapshot = $prestations
                ->map(function ($prestation) {
                    return [
                        'id'   => $prestation->id,
                        'nom'  => $prestation->nom,
                        'prix' => (float) $prestation->prix,
                    ];
                })
                ->values()
                ->toArray();

            $montantPrestations = $prestations->sum(
                fn ($p) => (float) $p->prix
            );

            $chapelle        = null;
            $montantChapelle = 0;

            if (!empty($data['chapelle_id'])) {
                $chapelle = Chapelle::where('id', $data['chapelle_id'])
                    ->where('actif', true)
                    ->first();

                if (!$chapelle) {
                    throw ValidationException::withMessages([
                        'chapelle_id' => ['La chapelle sélectionnée est introuvable ou inactive.'],
                    ]);
                }

                $montantChapelle = (float) $chapelle->prix;
            }

            $montantTotal =
                $montantPrestations +
                $montantNuits +
                $montantChapelle;

            $sortie = Sortie::create([
                'depot_id'            => $depot->id,
                'date'                => $data['date'],
                'heure'               => $data['heure'],
                'duree_levee'         => $dureeLevee,
                'recuperateur'        => $data['recuperateur']
                                            ?? $depot->contact_nom
                                            ?? null,
                'statut'              => 'EN COURS',
                'jours'               => $jours,
                'caisse'              => $depot->emplacement,
                'prestations'         => $prestationsSnapshot,
                'montant_prestations' => $montantPrestations,
                'montant_nuits'       => $montantNuits,
                'montant_chapelle'    => $montantChapelle,
                'montant_total'       => $montantTotal,
                'montant_paye'        => 0,
                'reste_a_payer'       => $montantTotal,
                'chapelle_id'         => $chapelle?->id,
                'chapelle_nom'        => $chapelle?->nom,
                'chapelle_prix'       => $chapelle?->prix ?? 0,
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

        if ($sortie->depot && $sortie->depot->scelle) {
            return response()->json(['message' => 'Ce corps est scellé.'], 423);
        }

        if ((float) $sortie->montant_paye > 0) {
            return response()->json([
                'message' => 'Cette sortie a déjà un paiement enregistré. Elle ne peut plus être modifiée.',
            ], 422);
        }

        $data = $request->validate([
            'date'          => ['required', 'date'],
            'heure'         => ['required', 'date_format:H:i'],
            'duree_levee'   => ['nullable', 'integer', 'min:15', 'max:480'],
            'recuperateur'  => ['nullable', 'string', 'max:255'],
            'chapelle_id'   => ['nullable', 'exists:chapelles,id'],
        ]);

        $dureeLevee = (int) ($data['duree_levee'] ?? $sortie->duree_levee ?? 60);
        $chapelleId = $data['chapelle_id'] ?? $sortie->chapelle_id;

        $this->verifierDisponibiliteChapelle(
            $chapelleId,
            $data['date'],
            $data['heure'],
            $dureeLevee,
            $sortie->id
        );

        $chapelle        = null;
        $montantChapelle = (float) $sortie->montant_chapelle;

        if ($chapelleId) {
            $chapelle = Chapelle::where('id', $chapelleId)->where('actif', true)->first();

            if (!$chapelle) {
                throw ValidationException::withMessages([
                    'chapelle_id' => ['La chapelle sélectionnée est introuvable ou inactive.'],
                ]);
            }

            $montantChapelle = (float) $chapelle->prix;
        }

        $montantTotal =
            (float) $sortie->montant_prestations +
            (float) $sortie->montant_nuits +
            $montantChapelle;

        $sortie->update([
            'date'             => $data['date'],
            'heure'            => $data['heure'],
            'duree_levee'      => $dureeLevee,
            'recuperateur'     => $data['recuperateur'] ?? $sortie->recuperateur,
            'chapelle_id'      => $chapelle?->id,
            'chapelle_nom'     => $chapelle?->nom,
            'chapelle_prix'    => $chapelle?->prix ?? 0,
            'montant_chapelle' => $montantChapelle,
            'montant_total'    => $montantTotal,
            'reste_a_payer'    => max(0, $montantTotal - (float) $sortie->montant_paye),
        ]);

        return response()->json(
            $sortie->fresh()->load(['depot', ...Sortie::TRACE])
        );
    }

    /* =========================================================
       ENREGISTRER UN PAIEMENT
    ========================================================= */

    public function paiement(Request $request, $id)
    {
        $data = $request->validate([
            'montant_paye' => ['required', 'numeric', 'gt:0'],
        ]);

        return DB::transaction(function () use ($data, $id) {
            $sortie = Sortie::lockForUpdate()->findOrFail($id);

            $dejaPaye        = (float) $sortie->montant_paye;
            $nouveauPaiement = (float) $data['montant_paye'];

            $montantPaye = min(
                $dejaPaye + $nouveauPaiement,
                (float) $sortie->montant_total
            );

            $reste = max(
                0,
                (float) $sortie->montant_total - $montantPaye
            );

            $statut = $montantPaye > 0 ? 'VALIDÉ' : 'EN COURS';

            $sortie->update([
                'montant_paye'  => $montantPaye,
                'reste_a_payer' => $reste,
                'statut'        => $statut,
            ]);

            Levee::updateOrCreate(
                ['sortie_id' => $sortie->id],
                [
                    'date'     => $sortie->date_string,
                    'heure'    => $sortie->heure,
                    'chapelle' => $sortie->chapelle_nom ?? $sortie->chapelle ?? null,
                    'statut'   => 'PLANIFIÉ',
                ]
            );

            Depot::findOrFail($sortie->depot_id)->update([
                'statut'      => 'SORTI',
                'date_sortie' => $sortie->date_string,
            ]);

            Audit::log(
                'SORTIES',
                'PAIEMENT',
                sprintf(
                    'Encaissement de %s FCFA sur la sortie #%d',
                    number_format($montantPaye - $dejaPaye, 0, ',', ' '),
                    $sortie->id
                ),
                [
                    'montant_encaisse' => $montantPaye - $dejaPaye,
                    'deja_paye'        => $dejaPaye,
                    'total_paye'       => $montantPaye,
                    'reste_a_payer'    => $reste,
                ],
                $sortie
            );

            return response()->json(
                $sortie->fresh()->load(['depot', ...Sortie::TRACE])
            );
        });
    }

    /* =========================================================
       SUPPRIMER UNE SORTIE
    ========================================================= */

    public function destroy(Request $request, $id)
    {
        $sortie = Sortie::findOrFail($id);

        if ((float) $sortie->montant_paye > 0) {
            return response()->json([
                'message' => 'Cette sortie a déjà un paiement enregistré. Elle ne peut plus être supprimée.',
            ], 422);
        }

        DB::transaction(function () use ($sortie, $request) {
            $this->mettreEnCorbeille(
                'SORTIE',
                $sortie->id,
                $sortie->toArray(),
                $request->input('raison')
            );

            $depot = $sortie->depot;

            $sortie->delete();

            $depot?->update([
                'statut'      => 'PRÉSENT',
                'date_sortie' => null,
            ]);
        });

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

        return 10000;
    }
}