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

        /* ---------- DURÉE MOYENNE (PostgreSQL) ----------
           En PostgreSQL : (date - date) renvoie un integer en jours
        ------------------------------------------------- */
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

            'conservation' => [
                'duree_moyenne_jours' => $dureeMoyenne,
            ],

            'par_provenance' => $parProvenance,
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
        ]);
    }

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
}