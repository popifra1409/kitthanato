<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('depots', function (Blueprint $table) {

            $table->id();

            // Code du dossier
            $table->string('code')->unique();

            // Informations du défunt
            $table->string('nom');
            $table->string('prenom');
            $table->string('sexe');
            $table->date('date_naissance')->nullable();
            $table->integer('age')->nullable();
            $table->string('profession')->nullable();

            // Décès
            $table->date('date_deces');
            $table->time('heure_deces')->nullable();

            // Informations du dépôt
            $table->date('date_arrivee');
            $table->time('heure_arrivee');
            $table->date('date_sortie')->nullable();

            // Provenance
            $table->string('provenance');
            $table->string('service_origine')->nullable();
            $table->string('lieu_provenance')->nullable();

            // Dépôt
            $table->string('motif');
            $table->text('etat')->nullable();
            $table->string('emplacement');
            $table->string('chapelle');

            // Famille / déposant
            $table->string('contact_nom');
            $table->string('contact_telephone');
            $table->string('lien_parente')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('depots');
    }
};