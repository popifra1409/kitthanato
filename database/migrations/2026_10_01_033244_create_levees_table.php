<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levees', function (Blueprint $table) {

            $table->id();

            // Sortie correspondante
            $table->foreignId('sortie_id')
                ->constrained('sorties')
                ->cascadeOnDelete();

            $table->date('date');
            $table->time('heure');

            // Récupérée automatiquement depuis le dépôt
            $table->string('chapelle')->nullable();

            // PLANIFIÉ / CONFIRMÉ / EN ATTENTE / TERMINÉ / ANNULÉ
            $table->string('statut')->default('PLANIFIÉ');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levees');
    }
};