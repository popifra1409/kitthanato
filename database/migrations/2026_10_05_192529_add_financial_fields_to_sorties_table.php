<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('sorties', function (Blueprint $table) {

            if (!Schema::hasColumn('sorties', 'statut')) {
                $table->string('statut')
                    ->default('EN COURS');
            }

            if (!Schema::hasColumn('sorties', 'jours')) {
                $table->integer('jours')->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_prestations')) {
                $table->decimal('montant_prestations', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_nuits')) {
                $table->decimal('montant_nuits', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_chapelle')) {
                $table->decimal('montant_chapelle', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_total')) {
                $table->decimal('montant_total', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_paye')) {
                $table->decimal('montant_paye', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('sorties', 'reste_a_payer')) {
                $table->decimal('reste_a_payer', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('sorties', 'chapelle')) {
                $table->string('chapelle')->nullable();
            }

            if (!Schema::hasColumn('sorties', 'chapelle_prix')) {
                $table->decimal('chapelle_prix', 12, 2)
                    ->default(0);
            }
        });
    }

    public function down()
    {
        //
    }
};