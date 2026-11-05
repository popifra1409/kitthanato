<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Sortie;
use App\Models\Transfert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StatistiqueController extends Controller
{
    /* =========================================================
       BORNES DE PÉRIODE
    ========================================================= */

    private function getPeriodBounds(Request $request): array
    {
        $periode = $request->query('periode', 'mois');
        $dateRef = $request->query('date', now()->toDateString());

        $ref = Carbon::parse($dateRef);

        switch ($periode) {
            case 'jour':
                $debut = $ref->copy()->startOfDay();
                $fin   = $ref->copy()->endOfDay();
                break;

            case 'semaine':
                $debut = $ref->copy()->startOfWeek(Carbon::MONDAY);
                $fin   = $ref->copy()->endOfWeek(Carbon::SUNDAY);
                break;

            case 'annee':
                $debut = $ref->copy()->startOfYear();
                $fin   = $ref->copy()->endOfYear();
                break;

            case 'mois':
            default:
                $debut = $ref->copy()->startOfMonth();
                $fin   = $ref->copy()->endOfMonth();
                break;
        }

        return compact('periode', 'debut', 'fin');
    }

    /* =========================================================
       INDEX
    ========================================================= */

    public function index(Request $request)
    {
        $bounds = $this->getPeriodBounds($request);
        $debut  = $bounds['debut'];
        $fin    = $bounds['fin'];

        /* ---------- COMPTEURS ---------- */
        $nbDepots     = Depot::whereBetween('created_at', [$debut, $fin])->count();
        $nbSorties    = Sortie::whereBetween('created_at', [$debut, $fin])->count();
        $nbTransferts = Transfert::whereBetween('created_at', [$debut, $fin])->count();

        $nbTransfertsInterne = Transfert::whereBetween('created_at', [$debut, $fin])
            ->where('type', 'interne')->count();

        $nbTransfertsExterne = Transfert::whereBetween('created_at', [$debut, $fin])
            ->where('type', 'externe')->count();

        /* ---------- DURÉE MOYENNE ---------- */
        $dureeMoyenne = Sortie::whereBetween('sorties.created_at', [$debut, $fin])
            ->join('depots', 'depots.id', '=', 'sorties.depot_id')
            ->whereNotNull('depots.date_arrivee')
            ->selectRaw('AVG(sorties.date - depots.date_arrivee) as moyenne')
            ->value('moyenne');

        $dureeMoyenne = round((float) $dureeMoyenne, 1);

        /* ---------- RÉPARTITIONS ---------- */
        $parProvenance = Depot::whereBetween('created_at', [$debut, $fin])
            ->select('provenance', DB::raw('COUNT(*) as total'))
            ->groupBy('provenance')
            ->orderByDesc('total')
            ->get();

        $parMotif = Depot::whereBetween('created_at', [$debut, $fin])
            ->select('motif', DB::raw('COUNT(*) as total'))
            ->groupBy('motif')
            ->orderByDesc('total')
            ->get();

        $parChapelle = Depot::whereBetween('created_at', [$debut, $fin])
            ->whereNotNull('chapelle')
            ->where('chapelle', '!=', '')
            ->select('chapelle', DB::raw('COUNT(*) as total'))
            ->groupBy('chapelle')
            ->orderByDesc('total')
            ->get();

        $parSexe = Depot::whereBetween('created_at', [$debut, $fin])
            ->select('sexe', DB::raw('COUNT(*) as total'))
            ->groupBy('sexe')
            ->get();

        $parService = Depot::whereBetween('created_at', [$debut, $fin])
            ->whereNotNull('service_origine')
            ->where('service_origine', '!=', '')
            ->select('service_origine', DB::raw('COUNT(*) as total'))
            ->groupBy('service_origine')
            ->orderByDesc('total')
            ->get();

        /* ---------- FINANCE ---------- */
        $finance = Sortie::whereBetween('created_at', [$debut, $fin])
            ->selectRaw('
                COALESCE(SUM(montant_total), 0)       as total_facture,
                COALESCE(SUM(montant_paye), 0)        as total_paye,
                COALESCE(SUM(reste_a_payer), 0)       as total_restant,
                COALESCE(SUM(montant_prestations), 0) as total_prestations,
                COALESCE(SUM(montant_nuits), 0)       as total_nuits,
                COALESCE(SUM(montant_chapelle), 0)    as total_chapelle,
                COALESCE(AVG(montant_total), 0)       as moyenne_facture
            ')
            ->first();

        /* ---------- TOP EMPLACEMENTS ---------- */
        $topEmplacements = Depot::whereBetween('created_at', [$debut, $fin])
            ->select('emplacement', DB::raw('COUNT(*) as total'))
            ->groupBy('emplacement')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        /* ---------- TRANSFERTS : DÉLAIS ---------- */
        $delaisTransferts = $this->delaisTransferts($debut, $fin);

        /* =========================================================
           DÉTAIL DES SORTIES DE LA PÉRIODE
           (pour les rapports impression + Excel)
           ⚠ Pas de relation 'chapelle' : on lit le snapshot.
        ========================================================= */

        $sortiesCollection = Sortie::with(['depot'])
            ->whereBetween('date', [$debut, $fin])
            ->orderBy('date')
            ->orderBy('heure')
            ->get();

        $sortiesDetail = $sortiesCollection->map(function (Sortie $s) {
            $prestations = [];
            if (is_array($s->prestations)) {
                foreach ($s->prestations as $p) {
                    $prestations[] = [
                        'nom'  => $p['nom']  ?? 'Prestation',
                        'prix' => (float) ($p['prix'] ?? 0),
                    ];
                }
            }

            $dateStr = $s->date instanceof \DateTimeInterface
                ? $s->date->format('Y-m-d')
                : substr((string) $s->date, 0, 10);

            $jours        = (int) ($s->jours ?? 0);
            $montantNuits = (float) ($s->montant_nuits ?? 0);
            $tarifJour    = $jours > 0 ? round($montantNuits / $jours, 2) : 0;

            return [
                'id'           => $s->id,
                'date'         => $dateStr,
                'heure'        => (string) $s->heure,
                'code_defunt'  => $s->depot->code ?? null,
                'nom_defunt'   => trim(
                    ($s->depot->nom ?? '') . ' ' . ($s->depot->prenom ?? '')
                ),
                'recuperateur' => $s->recuperateur
                                    ?? $s->depot->contact_nom
                                    ?? null,
                'statut'       => $s->statut,

                'jours'         => $jours,
                'caisse'        => $s->caisse,
                'tarif_jour'    => $tarifJour,
                'montant_nuits' => $montantNuits,

                /* ✅ Snapshot direct, plus d'appel à $s->chapelle */
                'chapelle_nom'  => $s->chapelle_nom ?? null,
                'chapelle_prix' => (float) ($s->chapelle_prix ?? 0),

                'prestations'          => $prestations,
                'montant_prestations'  => (float) ($s->montant_prestations ?? 0),

                'montant_total'  => (float) ($s->montant_total ?? 0),
                'montant_paye'   => (float) ($s->montant_paye ?? 0),
                'reste_a_payer'  => (float) ($s->reste_a_payer ?? 0),
            ];
        })->values()->toArray();

        /* ---------- AGRÉGATIONS DÉTAILS ---------- */
        $prestationsDetail = $this->agregerPrestations($sortiesDetail);
        $chapellesDetail   = $this->agregerChapelles($sortiesDetail);

        $conservationDetail = array_values(array_map(function ($s) {
            return [
                'date'          => $s['date'],
                'code_defunt'   => $s['code_defunt'],
                'nom_defunt'    => $s['nom_defunt'],
                'caisse'        => $s['caisse'],
                'jours'         => $s['jours'],
                'tarif_jour'    => $s['tarif_jour'],
                'montant_nuits' => $s['montant_nuits'],
            ];
        }, array_filter($sortiesDetail, fn ($s) => $s['montant_nuits'] > 0)));

        /* ---------- RÉPONSE ---------- */
        return response()->json([
            'periode' => [
                'type'    => $bounds['periode'],
                'debut'   => $debut->toDateString(),
                'fin'     => $fin->toDateString(),
                'libelle' => $this->libellePeriode($bounds),
            ],

            'compteurs' => [
                'depots'             => $nbDepots,
                'sorties'            => $nbSorties,
                'transferts'         => $nbTransferts,
                'transferts_interne' => $nbTransfertsInterne,
                'transferts_externe' => $nbTransfertsExterne,
            ],

            'transferts_delai' => $delaisTransferts,

            'conservation' => [
                'duree_moyenne_jours' => $dureeMoyenne,
            ],

            'par_provenance' => $parProvenance,
            'par_service'    => $parService,
            'par_motif'      => $parMotif,
            'par_chapelle'   => $parChapelle,
            'par_sexe'       => $parSexe,

            'finance' => [
                'total_facture'     => (float) $finance->total_facture,
                'total_paye'        => (float) $finance->total_paye,
                'total_restant'     => (float) $finance->total_restant,
                'total_prestations' => (float) $finance->total_prestations,
                'total_nuits'       => (float) $finance->total_nuits,
                'total_chapelle'    => (float) $finance->total_chapelle,
                'moyenne_facture'   => round((float) $finance->moyenne_facture, 2),
            ],

            'top_emplacements' => $topEmplacements,

            /* ---------- DÉTAILS POUR RAPPORTS ---------- */
            'sorties_detail'      => $sortiesDetail,
            'prestations_detail'  => $prestationsDetail,
            'chapelles_detail'    => $chapellesDetail,
            'conservation_detail' => $conservationDetail,
        ]);
    }

    /* =========================================================
       AGRÉGATIONS
    ========================================================= */

    private function agregerPrestations(array $sortiesDetail): array
    {
        $map = [];

        foreach ($sortiesDetail as $s) {
            foreach (($s['prestations'] ?? []) as $p) {
                $nom  = $p['nom']  ?? 'Prestation';
                $prix = (float) ($p['prix'] ?? 0);

                if (!isset($map[$nom])) {
                    $map[$nom] = ['nom' => $nom, 'quantite' => 0, 'total' => 0];
                }

                $map[$nom]['quantite'] += 1;
                $map[$nom]['total']    += $prix;
            }
        }

        $resultat = array_values(array_map(function ($p) {
            return [
                'nom'           => $p['nom'],
                'quantite'      => $p['quantite'],
                'prix_unitaire' => $p['quantite'] > 0
                                    ? round($p['total'] / $p['quantite'], 2)
                                    : 0,
                'total'         => $p['total'],
            ];
        }, $map));

        usort($resultat, fn ($a, $b) => $b['total'] <=> $a['total']);

        return $resultat;
    }

    private function agregerChapelles(array $sortiesDetail): array
    {
        $map = [];

        foreach ($sortiesDetail as $s) {
            $nom  = $s['chapelle_nom'] ?: 'Aucune chapelle';
            $prix = (float) ($s['chapelle_prix'] ?? 0);

            if (!isset($map[$nom])) {
                $map[$nom] = ['nom' => $nom, 'quantite' => 0, 'total' => 0];
            }

            $map[$nom]['quantite'] += 1;
            $map[$nom]['total']    += $prix;
        }

        $resultat = array_values(array_map(function ($c) {
            return [
                'chapelle'      => $c['nom'],
                'quantite'      => $c['quantite'],
                'prix_unitaire' => $c['quantite'] > 0
                                    ? round($c['total'] / $c['quantite'], 2)
                                    : 0,
                'total'         => $c['total'],
            ];
        }, $map));

        usort($resultat, fn ($a, $b) => $b['total'] <=> $a['total']);

        return $resultat;
    }

    /* =========================================================
       LIBELLÉ PÉRIODE
    ========================================================= */

    private function libellePeriode(array $bounds): string
    {
        $debut = $bounds['debut'];
        $fin   = $bounds['fin'];

        switch ($bounds['periode']) {
            case 'jour':
                return $debut->translatedFormat('d F Y');

            case 'semaine':
                return 'Semaine du '
                    . $debut->translatedFormat('d M Y')
                    . ' au '
                    . $fin->translatedFormat('d M Y');

            case 'annee':
                return 'Année ' . $debut->format('Y');

            case 'mois':
            default:
                return $debut->translatedFormat('F Y');
        }
    }

    /* =========================================================
       DÉLAIS TRANSFERTS
    ========================================================= */

    private function delaisTransferts($debut, $fin): array
    {
        $transferts = Transfert::with('depot')
            ->whereBetween('created_at', [$debut, $fin])
            ->get();

        $moins24     = 0;
        $plus24      = 0;
        $nonCalcules = 0;
        $totalHeures = 0;
        $compte      = 0;

        foreach ($transferts as $t) {
            $depot = $t->depot;

            if (!$depot || !$depot->date_arrivee || !$t->date || !$t->heure) {
                $nonCalcules++;
                continue;
            }

            $dateArrivee  = Carbon::parse($depot->date_arrivee)->format('Y-m-d');
            $heureArrivee = $depot->heure_arrivee
                ? substr((string) $depot->heure_arrivee, 0, 5)
                : '00:00';

            $dateTransfert  = Carbon::parse($t->date)->format('Y-m-d');
            $heureTransfert = substr((string) $t->heure, 0, 5);

            $arrivee   = Carbon::parse("$dateArrivee $heureArrivee");
            $transfert = Carbon::parse("$dateTransfert $heureTransfert");

            $heures = max(
                0,
                ($transfert->getTimestamp() - $arrivee->getTimestamp()) / 3600
            );

            if ($heures < 24) {
                $moins24++;
            } else {
                $plus24++;
            }

            $totalHeures += $heures;
            $compte++;
        }

        return [
            'moins_24h'      => $moins24,
            'plus_24h'       => $plus24,
            'non_calcules'   => $nonCalcules,
            'moyenne_heures' => $compte > 0 ? round($totalHeures / $compte, 1) : 0,
        ];
    }
}