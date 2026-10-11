<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
| Correctif : la table pivot depot_prestation (utilisée par
| Depot::prestations()) n'était créée par aucune migration — la migration
| « create_depot_prestation_table » ne crée en réalité que « prestations ».
| Sur une installation neuve, l'enregistrement d'un dépôt échouait.
| Sans effet si la table existe déjà.
*/
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('depot_prestation')) {
            return;
        }

        Schema::create('depot_prestation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('prestation_id')->constrained('prestations')->restrictOnDelete();
            $table->decimal('prix', 12, 2)->default(0);
            $table->timestamps();
            $table->unique(['depot_id', 'prestation_id']);
        });
    }

    public function down(): void
    {
        // Volontairement vide : on ne supprime pas une table qui pouvait
        // exister avant ce correctif.
    }
};
