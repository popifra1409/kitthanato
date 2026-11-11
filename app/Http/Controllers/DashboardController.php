<?php

namespace App\Http\Controllers;

use App\Models\ChambreFroide;
use App\Models\Depot;
use App\Models\Sortie;
use App\Models\Transfert;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const JOURS_SERIE = 14;

    /**
     * GET /api/dashboard
     *
     * Agrégats du tableau de bord en une seule requête : compteurs,
     * série des 14 derniers jours, occupation des chambres, alertes,
     * dernières entrées/sorties et synthèse financière.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $peutVoirDepots = $user->hasPermission('depots.view');
        $peutVoirSorties = $user->hasPermission('sorties.view');
        $peutVoirTransferts = $user->hasPermission('transferts.view');
        $peutVoirEmplacements = $user->hasPermission('emplacements.view');

        $debutMois = now()->startOfMonth();
        $finMois = now()->endOfMonth();
        $debutMoisPrecedent = now()->subMonthNoOverflow()->startOfMonth();
        $finMoisPrecedent = now()->subMonthNoOverflow()->endOfMonth();

        $presents = Depot::presents()->count();

        $admissionsMois = Depot::whereBetween('date_arrivee', [$debutMois, $finMois])->count();
        $admissionsMoisPrecedent = Depot::whereBetween('date_arrivee', [$debutMoisPrecedent, $finMoisPrecedent])->count();

        $sortiesMois = Sortie::whereBetween('date', [$debutMois, $finMois])->count();
        $sortiesMoisPrecedent = Sortie::whereBetween('date', [$debutMoisPrecedent, $finMoisPrecedent])->count();

        $transfertsMois = Transfert::whereBetween('date', [$debutMois, $finMois])->count();

        $serie = $this->serieQuatorzeJours();

        $finance = $this->finance();
        $occupation = $peutVoirEmplacements ? $this->occupation() : null;

        return response()->json([
            'genere_le' => now()->toIso8601String(),

            'compteurs' => [
                'presents' => $presents,
                'admissions' => Depot::count(),
                'admissions_aujourdhui' => Depot::whereDate('date_arrivee', today())->count(),
                'admissions_mois' => $admissionsMois,
                'sorties' => $peutVoirSorties ? Sortie::count() : null,
                'sorties_aujourdhui' => $peutVoirSorties
                    ? Sortie::whereDate('date', today())->count()
                    : null,
                'sorties_mois' => $peutVoirSorties ? $sortiesMois : null,
                'transferts' => $peutVoirTransferts ? Transfert::count() : null,
                'transferts_mois' => $peutVoirTransferts ? $transfertsMois : null,
                'scelles' => $peutVoirDepots
                    ? Depot::presents()->where('scelle', true)->count()
                    : null,
                'non_attribues' => $peutVoirDepots
                    ? Depot::presents()->whereNull('caisson_id')->count()
                    : null,
            ],

            'tendances' => [
                'admissions' => $this->variation($admissionsMois, $admissionsMoisPrecedent),
                'sorties' => $peutVoirSorties
                    ? $this->variation($sortiesMois, $sortiesMoisPrecedent)
                    : null,
            ],

            'serie' => $serie,

            'conservation' => [
                'duree_moyenne_jours' => $peutVoirSorties
                    ? $this->dureeMoyenneSejour($debutMois, $finMois)
                    : null,
            ],

            'occupation' => $occupation,

            'dernieres_admissions' => $peutVoirDepots
                ? $this->dernieresAdmissions()
                : [],

            'dernieres_sorties' => $peutVoirSorties
                ? $this->dernieresSorties()
                : [],

            'alertes' => $this->alertes($peutVoirDepots, $peutVoirSorties),

            'finance' => $peutVoirSorties ? $finance : null,
        ]);
    }

    /**
     * Série admissions / sorties sur les 14 derniers jours (aujourd'hui inclus).
     */
    private function serieQuatorzeJours(): array
    {
        $debut = today()->subDays(self::JOURS_SERIE - 1);

        $admissions = $this->indexerParJour(
            Depot::whereBetween('date_arrivee', [$debut->toDateString(), today()->toDateString()])
                ->selectRaw('date_arrivee as jour, COUNT(*) as total')
                ->groupBy('date_arrivee')
                ->pluck('total', 'jour')
        );

        $sorties = $this->indexerParJour(
            Sortie::whereBetween('date', [$debut->toDateString(), today()->toDateString()])
                ->selectRaw('date as jour, COUNT(*) as total')
                ->groupBy('date')
                ->pluck('total', 'jour')
        );

        $points = [];

        for ($i = 0; $i < self::JOURS_SERIE; $i++) {
            $jour = today()->subDays(self::JOURS_SERIE - 1 - $i);
            $cle = $jour->toDateString();

            $points[] = [
                'date' => $cle,
                'label' => $jour->format('d/m'),
                'admissions' => $admissions[$cle] ?? 0,
                'sorties' => $sorties[$cle] ?? 0,
            ];
        }

        return [
            'jours' => self::JOURS_SERIE,
            'points' => $points,
        ];
    }

    /**
     * Regroupe une collection « date => total » en clés YYYY-MM-DD.
     */
    private function indexerParJour($collection): array
    {
        $index = [];

        foreach ($collection as $cle => $total) {
            $jour = substr((string) $cle, 0, 10);
            $index[$jour] = (int) $total;
        }

        return $index;
    }

    /**
     * Variation en pourcentage entre la période courante et la précédente.
     * null quand la période de référence est vide (évite une division par zéro).
     */
    private function variation(int $courant, int $precedent): array
    {
        return [
            'valeur' => $courant,
            'precedent' => $precedent,
            'variation' => $precedent > 0
                ? round((($courant - $precedent) / $precedent) * 100, 1)
                : null,
        ];
    }

    /**
     * Durée moyenne de séjour (en jours) des sorties du mois.
     */
    private function dureeMoyenneSejour(Carbon $debut, Carbon $fin): ?float
    {
        $durees = Sortie::with('depot:id,date_arrivee')
            ->whereBetween('date', [$debut, $fin])
            ->get()
            ->map(function (Sortie $sortie) {
                $arrivee = $sortie->depot?->date_arrivee;

                if (! $arrivee || ! $sortie->date) {
                    return null;
                }

                return max(
                    0,
                    ($sortie->date->copy()->startOfDay()->timestamp
                        - $arrivee->copy()->startOfDay()->timestamp) / 86400
                );
            })
            ->filter(fn ($duree) => $duree !== null);

        return $durees->isNotEmpty() ? round($durees->avg(), 1) : null;
    }

    /**
     * Occupation par chambre froide et totaux de caissons.
     */
    private function occupation(): array
    {
        $chambres = ChambreFroide::with([
            'caissons' => fn ($query) => $query->withCount([
                'depots as occupes' => fn ($depots) => $depots->presents(),
            ]),
        ])
            ->orderBy('nom')
            ->get()
            ->map(function (ChambreFroide $chambre) {
                $caissons = $chambre->caissons;
                $actifs = $caissons->where('actif', true)->values();
                $occupes = (int) $actifs->sum('occupes');
                $libres = max(0, $actifs->count() - $occupes);

                return [
                    'id' => $chambre->id,
                    'nom' => $chambre->nom,
                    'type' => $chambre->type,
                    'actif' => $chambre->actif,
                    'caissons' => $caissons->count(),
                    'caissons_actifs' => $actifs->count(),
                    'occupes' => $occupes,
                    'libres' => $libres,
                    'inactifs' => $caissons->where('actif', false)->count(),
                    'taux' => $actifs->count() > 0
                        ? (int) round(($occupes / $actifs->count()) * 100)
                        : 0,
                ];
            })
            ->values();

        $caissonsActifs = $chambres->sum('caissons_actifs');
        $occupes = $chambres->sum('occupes');

        return [
            'chambres' => $chambres,
            'totaux' => [
                'caissons' => $chambres->sum('caissons'),
                'actifs' => $caissonsActifs,
                'occupes' => $occupes,
                'libres' => max(0, $caissonsActifs - $occupes),
                'inactifs' => $chambres->sum('inactifs'),
                'taux' => $caissonsActifs > 0
                    ? (int) round(($occupes / $caissonsActifs) * 100)
                    : 0,
            ],
        ];
    }

    private function dernieresAdmissions(): array
    {
        return Depot::with('caisson.chambreFroide')
            ->withExists([
                'sorties as a_sortie_payee' => fn ($query) => $query->where('montant_paye', '>', 0),
                'transferts as a_transfert_externe' => fn ($query) => $query
                    ->whereRaw('LOWER(type) = ?', ['externe']),
            ])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn (Depot $depot) => [
                'id' => $depot->id,
                'code' => $depot->code,
                'code_defunt' => $depot->code_defunt,
                'nom' => $depot->nom,
                'prenom' => $depot->prenom,
                'date_arrivee' => optional($depot->date_arrivee)->format('Y-m-d'),
                'caisson' => $depot->caisson?->code,
                'chambre' => $depot->caisson?->chambreFroide?->nom,
                'scelle' => (bool) $depot->scelle,
                'statut' => $depot->a_sortie_payee
                    ? 'SORTI'
                    : ($depot->a_transfert_externe ? 'TRANSFÉRÉ' : 'PRÉSENT'),
            ])
            ->values()
            ->all();
    }

    private function dernieresSorties(): array
    {
        return Sortie::with('depot:id,code,nom,prenom')
            ->orderByDesc('date')
            ->orderByDesc('heure')
            ->limit(5)
            ->get()
            ->map(fn (Sortie $sortie) => [
                'id' => $sortie->id,
                'date' => $sortie->date?->format('Y-m-d'),
                'heure' => $sortie->heure ? substr((string) $sortie->heure, 0, 5) : null,
                'depot_id' => $sortie->depot_id,
                'code' => $sortie->depot?->code,
                'nom' => $sortie->depot?->nom,
                'prenom' => $sortie->depot?->prenom,
                'recuperateur' => $sortie->recuperateur,
                'statut' => $sortie->statut,
                'montant_total' => (float) $sortie->montant_total,
                'reste_a_payer' => (float) $sortie->reste_a_payer,
            ])
            ->values()
            ->all();
    }

    private function alertes(bool $peutVoirDepots, bool $peutVoirSorties): array
    {
        $alertes = [];

        if ($peutVoirDepots) {
            $nonAttribues = Depot::presents()
                ->whereNull('caisson_id')
                ->orderBy('date_arrivee')
                ->get(['id', 'code', 'nom', 'prenom', 'date_arrivee', 'scelle'])
                ->map(fn (Depot $depot) => [
                    'id' => $depot->id,
                    'code' => $depot->code,
                    'nom' => trim(($depot->nom ?? '') . ' ' . ($depot->prenom ?? '')),
                    'date_arrivee' => optional($depot->date_arrivee)->format('Y-m-d'),
                    'scelle' => (bool) $depot->scelle,
                ]);

            $alertes['non_attribues'] = [
                'total' => $nonAttribues->count(),
                'corps' => $nonAttribues->take(5)->values(),
            ];

            $alertes['scelles'] = [
                'total' => Depot::presents()->where('scelle', true)->count(),
            ];
        }

        if ($peutVoirSorties) {
            $impayees = Sortie::with('depot:id,code,nom,prenom')
                ->where('reste_a_payer', '>', 0)
                ->orderByDesc('date')
                ->get();

            $alertes['impayes'] = [
                'total' => $impayees->count(),
                'montant' => (float) $impayees->sum('reste_a_payer'),
                'sorties' => $impayees
                    ->take(5)
                    ->map(fn (Sortie $sortie) => [
                        'id' => $sortie->id,
                        'depot_id' => $sortie->depot_id,
                        'code' => $sortie->depot?->code,
                        'nom' => trim(($sortie->depot?->nom ?? '') . ' ' . ($sortie->depot?->prenom ?? '')),
                        'date' => optional($sortie->date)->format('Y-m-d'),
                        'reste_a_payer' => (float) $sortie->reste_a_payer,
                    ])
                    ->values(),
            ];
        }

        return $alertes;
    }

    /**
     * Synthèse financière du mois et cumul global.
     */
    private function finance(): array
    {
        $mois = Sortie::whereBetween('date', [now()->startOfMonth(), now()->endOfMonth()])
            ->selectRaw('
                COALESCE(SUM(montant_total), 0)   as facture,
                COALESCE(SUM(montant_paye), 0)    as paye,
                COALESCE(SUM(reste_a_payer), 0)   as restant
            ')
            ->first();

        $global = Sortie::selectRaw('
                COALESCE(SUM(montant_total), 0)   as facture,
                COALESCE(SUM(montant_paye), 0)    as paye,
                COALESCE(SUM(reste_a_payer), 0)   as restant
            ')
            ->first();

        return [
            'mois' => [
                'facture' => (float) $mois->facture,
                'paye' => (float) $mois->paye,
                'restant' => (float) $mois->restant,
            ],
            'global' => [
                'facture' => (float) $global->facture,
                'paye' => (float) $global->paye,
                'restant' => (float) $global->restant,
            ],
        ];
    }
}
