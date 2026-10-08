<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('prestations', function (Blueprint $table) {

            $table->id();

            $table->string('nom');

            $table->decimal('prix', 12, 2)
                ->default(0);

            $table->boolean('obligatoire')
                ->default(true);

            $table->boolean('actif')
                ->default(true);

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('prestations');
    }
};