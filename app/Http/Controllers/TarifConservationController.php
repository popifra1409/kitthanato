<?php

namespace App\Http\Controllers;

use App\Models\TarifConservation;
use Illuminate\Http\Request;
use App\Models\Sortie;
use Illuminate\Support\Facades\DB;


class TarifConservationController extends Controller
{
    public function index()
    {
        return response()->json(TarifConservation::orderBy('id')->get());
    }

   public function update(Request $request, $id)
{
    $tarif = TarifConservation::findOrFail($id);

    $data = $request->validate([
        'prix' => ['required', 'numeric', 'min:0', 'max:99999999'],
    ]);

    $recalculees = DB::transaction(function () use ($tarif, $data) {
        $tarif->update(['prix' => $data['prix']]);
        $prix = (float) $data['prix'];

        $nomChambre = mb_strtolower(trim($tarif->emplacement));

        /*
         * On cible les sorties non payées dont le dépôt appartient
         * à la CHAMBRE FROIDE dont le nom correspond au tarif.
         *
         * Deux cas :
         *   a) depot.caisson_id défini → on matche via caisson.chambreFroide.nom
         *   b) depot.caisson_id null (ancien dépôt) → on matche sur le préfixe
         *      avant " · " de depot.emplacement
         */
        $sorties = Sortie::query()
            ->where('montant_paye', '<=', 0)
            ->whereHas('depot', function ($q) use ($nomChambre) {
                $q->where(function ($sub) use ($nomChambre) {
                    // Cas (a) : via le caisson
                    $sub->whereHas('caisson.chambreFroide', function ($cq) use ($nomChambre) {
                        $cq->whereRaw(
                            'LOWER(TRIM(nom)) = ?',
                            [$nomChambre]
                        );
                    })
                    // Cas (b) : via le libellé "Chambre A · C-01"
                    ->orWhere(function ($fb) use ($nomChambre) {
                        $fb->whereNull('caisson_id')
                           ->whereRaw(
                               "LOWER(TRIM(SPLIT_PART(emplacement, '·', 1))) = ?",
                               [$nomChambre]
                           );
                    });
                });
            })
            ->get();

        foreach ($sorties as $sortie) {
            $montantNuits = (int) $sortie->jours * $prix;
            $montantTotal = (float) $sortie->montant_prestations
                          + $montantNuits
                          + (float) $sortie->montant_chapelle;

            $sortie->update([
                'montant_nuits' => $montantNuits,
                'montant_total' => $montantTotal,
                'reste_a_payer' => $montantTotal,
            ]);
        }

        return $sorties->count();
    });

    return response()->json([
        'tarif'               => $tarif->fresh(),
        'sorties_recalculees' => $recalculees,
    ]);
}

}
