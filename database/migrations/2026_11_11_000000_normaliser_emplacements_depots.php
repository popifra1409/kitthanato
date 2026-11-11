<?php

use App\Models\Depot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Aligne les dépôts existants sur le modèle caisson / chambre :
 *  - dépôt rattaché à un caisson → emplacement = "Chambre · A1" ;
 *  - ancien texte libre "Chambre froide …" → vocabulaire actuel.
 * Aucun caisson n'est inventé : les corps sans caisson restent à attribuer.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            Depot::query()
                ->with('caisson.chambreFroide')
                ->whereNotNull('caisson_id')
                ->chunkById(200, function ($depots) {
                    foreach ($depots as $depot) {
                        $caisson = $depot->caisson;
                        if (!$caisson) {
                            continue;
                        }

                        $chambre = $caisson->chambreFroide?->nom;
                        $libelle = $chambre
                            ? "{$chambre} · {$caisson->code}"
                            : $caisson->code;

                        if ($depot->emplacement !== $libelle) {
                            $depot->forceFill(['emplacement' => $libelle])->saveQuietly();
                        }
                    }
                });

            Depot::query()
                ->whereNull('caisson_id')
                ->where('emplacement', 'ilike', '%chambre froide%')
                ->chunkById(200, function ($depots) {
                    foreach ($depots as $depot) {
                        $texte = preg_replace(
                            ['/chambre\s+froide\s+individuelle/i', '/chambre\s+froide\s+commune/i', '/chambre\s+froide/i'],
                            ['Chambre individuelle', 'Chambre commune', 'Chambre'],
                            $depot->emplacement
                        );

                        if ($texte && $texte !== $depot->emplacement) {
                            $depot->forceFill(['emplacement' => $texte])->saveQuietly();
                        }
                    }
                });
        });
    }

    public function down(): void
    {
        /* Normalisation de données : pas de retour arrière possible. */
    }
};
