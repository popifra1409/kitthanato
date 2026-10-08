<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transferts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('depot_id')
                ->constrained('depots')
                ->cascadeOnDelete();

            $table->enum('type', ['interne', 'externe']);

            $table->date('date');
            $table->time('heure');

            $table->string('emplacement_destination')->nullable();
            $table->string('destination')->nullable();

            $table->enum('statut', ['EN ATTENTE', 'VALIDÉ'])
                ->default('EN ATTENTE');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferts');
    }
};