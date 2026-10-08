<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('declaration_deces', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | LIEN AVEC LE DÉPÔT
            |--------------------------------------------------------------------------
            */

            $table->foreignId('depot_id')
                ->nullable()
                ->constrained('depots')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | NUMÉRO DE DÉCLARATION
            |--------------------------------------------------------------------------
            */

            $table->string('numero_declaration')->unique();

            /*
            |--------------------------------------------------------------------------
            | INFORMATIONS ADMINISTRATIVES / SANITAIRES
            |--------------------------------------------------------------------------
            */

            $table->string('region')->nullable();
            $table->string('departement')->nullable();
            $table->string('arrondissement')->nullable();
            $table->string('district_sante')->nullable();
            $table->string('aire_sante')->nullable();
            $table->string('formation_sanitaire')->nullable();
            $table->string('ville_village_quartier')->nullable();

            /*
            |--------------------------------------------------------------------------
            | INFORMATIONS SUR LE DÉFUNT
            |--------------------------------------------------------------------------
            */

            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();

            $table->string('sexe')->nullable();

            $table->date('date_naissance')->nullable();

            $table->integer('age')->nullable();

            $table->string('lieu_naissance')->nullable();

            $table->string('nationalite')->nullable();

            $table->string('cni_autre')->nullable();

            $table->string('profession')->nullable();

            $table->string('domicile')->nullable();

            $table->string('statut_matrimonial')->nullable();

            /*
            |--------------------------------------------------------------------------
            | INFORMATIONS SUR LE DÉCÈS
            |--------------------------------------------------------------------------
            */

            $table->date('date_deces')->nullable();

            $table->time('heure_deces')->nullable();

            $table->string('lieu_deces')->nullable();

            $table->string('site_deces')->nullable();

            $table->text('circonstances_deces')->nullable();

            /*
            |--------------------------------------------------------------------------
            | DÉCLARANT
            |--------------------------------------------------------------------------
            */

            $table->string('declarant_nom')->nullable();

            $table->string('declarant_qualite')->nullable();

            $table->string('declarant_contact')->nullable();

            $table->text('declarant_signature')->nullable();

            $table->date('declarant_date')->nullable();

            /*
            |--------------------------------------------------------------------------
            | OFFICIER D'ÉTAT CIVIL
            |--------------------------------------------------------------------------
            */

            $table->string('officier_nom')->nullable();

            $table->string('officier_qualite')->nullable();

            $table->string('centre_etat_civil')->nullable();

            $table->date('date_reception')->nullable();

            /*
            |--------------------------------------------------------------------------
            | CAUSES MÉDICALES
            |--------------------------------------------------------------------------
            */

            $table->text('cause_a')->nullable();

            $table->text('cause_b')->nullable();

            $table->text('cause_c')->nullable();

            $table->text('cause_d')->nullable();

            $table->text('autres_affections')->nullable();

            /*
            |--------------------------------------------------------------------------
            | AUTRES DONNÉES MÉDICALES
            |--------------------------------------------------------------------------
            */

            $table->string('chirurgie_recente')->nullable();

            $table->date('date_chirurgie')->nullable();

            $table->text('raison_chirurgie')->nullable();

            $table->string('autopsie')->nullable();

            $table->string('resultats_autopsie_utilises')->nullable();

            /*
            |--------------------------------------------------------------------------
            | GENRE DE MORT
            |--------------------------------------------------------------------------
            */

            $table->string('genre_mort')->nullable();

            $table->string('cause_mort')->nullable();

            $table->string('cause_externe')->nullable();

            $table->string('cause_indeterminee')->nullable();

            $table->date('date_blessure')->nullable();

            $table->text('description_cause_externe')->nullable();

            $table->string('lieu_cause_externe')->nullable();

            /*
            |--------------------------------------------------------------------------
            | DONNÉES FŒTALES / INFANTILES
            |--------------------------------------------------------------------------
            */

            $table->string('grossesse_multiple')->nullable();

            $table->string('mort_ne')->nullable();

            $table->integer('heures_survecues')->nullable();

            $table->integer('poids_naissance')->nullable();

            $table->integer('semaines_grossesse')->nullable();

            $table->integer('age_mere')->nullable();

            $table->string('conditions_mere')->nullable();

            $table->string('defunte_enceinte')->nullable();

            $table->string('moment_grossesse')->nullable();

            $table->string('grossesse_contribue_deces')->nullable();

            /*
            |--------------------------------------------------------------------------
            | FORMATION SANITAIRE
            |--------------------------------------------------------------------------
            */

            $table->string('responsable_nom')->nullable();

            $table->string('responsable_qualite')->nullable();

            $table->date('responsable_date')->nullable();

            $table->text('responsable_signature')->nullable();

            /*
            |--------------------------------------------------------------------------
            | STATUT
            |--------------------------------------------------------------------------
            */

            $table->string('statut')
                ->default('ENREGISTRÉE');

            $table->timestamps();

            $table->index('date_deces');
            $table->index('statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('declaration_deces');
    }
};