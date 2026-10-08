<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('finance_to_sortie', function (Blueprint $table) {

            $table->id();

            $table->foreignId('sortie_id')
                ->constrained('sorties')
                ->cascadeOnDelete();

            $table->string('type');
            // prestation / caisse / chapelle

            $table->string('libelle');

            $table->decimal('montant', 12, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('finance_to_sortie');
    }
};