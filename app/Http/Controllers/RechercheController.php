<?php

namespace App\Http\Controllers;

use App\Models\DeclarationDeces;
use App\Models\Depot;
use App\Models\Sortie;
use Illuminate\Http\Request;

class RechercheController extends Controller
{
    private const LONGUEUR_MINIMUM = 2;

    private const PAR_GROUPE = 6;

    /**
     * GET /api/recherche?q=...
     *
     * Recherche globale : corps déposés, sorties et déclarations.
     * Chaque groupe n'est renvoyé que si l'utilisateur en a la permission,
     * et la réponse ne contient alors aucune ligne de ce module.
     */
    public function index(Request $request)
    {
        $requete = trim((string) $request->query('q', ''));

        if (mb_strlen($requete) < self::LONGUEUR_MINIMUM) {
            return response()->json([
                'requete' => $requete,
                'longueur_minimum' => self::LONGUEUR_MINIMUM,
                'total' => 0,
            ]);
        }

        $motif = '%' . str_replace(
            ['\\', '%', '_'],
            ['\\\\', '\\%', '\\_'],
            $requete
        ) . '%';

        $user = $request->user();
        $groupes = [];

        if ($user->hasPermission('depots.view')) {
            $groupes['corps'] = $this->corps($motif);
        }

        if ($user->hasPermission('sorties.view')) {
            $groupes['sorties'] = $this->sorties($motif);
        }

        if ($user->hasPermission('declarations.view')) {
            $groupes['declarations'] = $this->declarations($motif);
        }

        return response()->json([
            'requete' => $requete,
            'total' => array_sum(array_map('count', $groupes)),
            ...$groupes,
        ]);
    }

    private function corps(string $motif): array
    {
        return Depot::query()
            ->with('caisson:id,code,chambre_froide_id', 'caisson.chambreFroide:id,nom')
            ->withExists([
                'sorties as a_sortie_payee' => fn ($query) => $query
                    ->where('montant_paye', '>', 0),
                'transferts as a_transfert_externe' => fn ($query) => $query
                    ->whereRaw('LOWER(type) = ?', ['externe']),
            ])
            ->where(function ($query) use ($motif) {
                $query->where('code', 'ILIKE', $motif)
                    ->orWhere('code_defunt', 'ILIKE', $motif)
                    ->orWhere('nom', 'ILIKE', $motif)
                    ->orWhere('prenom', 'ILIKE', $motif)
                    ->orWhereHas('caisson', fn ($caisson) => $caisson
                        ->where('code', 'ILIKE', $motif))
                    ->orWhereHas('caisson.chambreFroide', fn ($chambre) => $chambre
                        ->where('nom', 'ILIKE', $motif));
            })
            ->orderByDesc('created_at')
            ->limit(self::PAR_GROUPE)
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

    private function sorties(string $motif): array
    {
        return Sortie::query()
            ->with('depot:id,code,code_defunt,nom,prenom')
            ->where(function ($query) use ($motif) {
                $query->where('recuperateur', 'ILIKE', $motif)
                    ->orWhere('recuperateur_cni', 'ILIKE', $motif)
                    ->orWhereHas('depot', fn ($depot) => $depot
                        ->where('code', 'ILIKE', $motif)
                        ->orWhere('code_defunt', 'ILIKE', $motif)
                        ->orWhere('nom', 'ILIKE', $motif)
                        ->orWhere('prenom', 'ILIKE', $motif));
            })
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(self::PAR_GROUPE)
            ->get()
            ->map(fn (Sortie $sortie) => [
                'id' => $sortie->id,
                'depot_id' => $sortie->depot_id,
                'code' => $sortie->depot?->code,
                'code_defunt' => $sortie->depot?->code_defunt,
                'nom' => $sortie->depot?->nom,
                'prenom' => $sortie->depot?->prenom,
                'date' => $sortie->date?->format('Y-m-d'),
                'heure' => $sortie->heure ? substr((string) $sortie->heure, 0, 5) : null,
                'recuperateur' => $sortie->recuperateur,
                'montant_total' => (float) $sortie->montant_total,
                'reste_a_payer' => (float) $sortie->reste_a_payer,
            ])
            ->values()
            ->all();
    }

    private function declarations(string $motif): array
    {
        return DeclarationDeces::query()
            ->where(function ($query) use ($motif) {
                $query->where('numero_declaration', 'ILIKE', $motif)
                    ->orWhere('nom', 'ILIKE', $motif)
                    ->orWhere('prenom', 'ILIKE', $motif)
                    ->orWhere('declarant_nom', 'ILIKE', $motif);
            })
            ->orderByDesc('created_at')
            ->limit(self::PAR_GROUPE)
            ->get(['id', 'depot_id', 'numero_declaration', 'nom', 'prenom', 'date_deces', 'declarant_nom'])
            ->map(fn (DeclarationDeces $declaration) => [
                'id' => $declaration->id,
                'depot_id' => $declaration->depot_id,
                'numero_declaration' => $declaration->numero_declaration,
                'nom' => $declaration->nom,
                'prenom' => $declaration->prenom,
                'date_deces' => optional($declaration->date_deces)->format('Y-m-d'),
                'declarant_nom' => $declaration->declarant_nom,
            ])
            ->values()
            ->all();
    }
}
