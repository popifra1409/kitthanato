<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('depots', function (Blueprint $table) {

            if (!Schema::hasColumn('depots', 'prestations')) {
                $table->jsonb('prestations')->nullable();
            }

            if (!Schema::hasColumn('depots', 'montant_prestations')) {
                $table->decimal('montant_prestations', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('depots', 'statut')) {
                $table->string('statut')
                    ->default('PRÉSENT');
            }
        });
    }

    public function down()
    {
        //
    }
};