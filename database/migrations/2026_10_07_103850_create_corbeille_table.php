<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('corbeille', function (Blueprint $table) {
            $table->id();

            /* Type d'élément supprimé : sortie, depot, transfert, etc. */
            $table->string('element_type', 50);

            /* ID de l'élément dans sa table d'origine */
            $table->unsignedBigInteger('element_id');

            /* Snapshot complet de l'élément (JSON) */
            $table->jsonb('donnees')->nullable();

            /* Qui a supprimé */
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            /* Infos complémentaires */
            $table->string('user_name')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('raison')->nullable();

            $table->timestamps();

            /* Index pour recherche */
            $table->index(['element_type', 'element_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corbeille');
    }
};