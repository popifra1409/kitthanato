<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sorties', function (Blueprint $table) {

            $table->id();

            // Corps enregistré au dépôt
            $table->foreignId('depot_id')
                ->constrained('depots')
                ->cascadeOnDelete();

            // Informations de sortie
            $table->date('date');
            $table->time('heure');
            $table->string('recuperateur');
            $table->integer('montant')->default(0);

            // EN ATTENTE / VALIDÉE

            $table->string('statut')
                ->default('programme')
                ->after('reste_a_payer');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sorties');
    }
};