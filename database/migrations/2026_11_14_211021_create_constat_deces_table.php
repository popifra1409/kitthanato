<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('constat_deces', function (Blueprint $table) {
            $table->id();

            /* Dépôt associé (unique : 1 constat par dépôt) */
            $table->foreignId('depot_id')
                  ->constrained('depots')
                  ->cascadeOnDelete();

            /* Référence unique : 2026/001/HGY/DMR/CD */
            $table->string('reference', 100)->unique();

            /* Identité (snapshot au moment du constat) */
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->string('sexe', 10)->nullable();       // M / F
            $table->date('date_naissance')->nullable();
            $table->integer('age')->nullable();
            $table->string('lieu_deces', 255)->nullable();

            /* Décès */
            $table->date('date_deces');
            $table->time('heure_deces')->nullable();

            /* Constat */
            $table->string('praticien', 150);
            $table->date('date_constat')->nullable();
            $table->time('heure_constat')->nullable();

            /* Circonstances / observations */
            $table->text('circonstance_1')->nullable();
            $table->text('circonstance_2')->nullable();
            $table->text('circonstance_3')->nullable();

            /* Obstacle médico-légal : null / oui / non */
            $table->string('obstacle_medico_legal', 10)->nullable();

            /* Fait à / Le / Heure */
            $table->string('fait_a', 100)->default('Yaoundé');
            $table->date('fait_le')->nullable();
            $table->time('fait_heure')->nullable();

            /* Traçabilité */
            $table->foreignId('createur_id')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->foreignId('modificateur_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('depot_id');
            $table->index('date_deces');
            $table->index('reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('constat_deces');
    }
};