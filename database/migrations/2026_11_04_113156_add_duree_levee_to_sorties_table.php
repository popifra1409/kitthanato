<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sorties', function (Blueprint $table) {
            // Durée de la levée de corps, en minutes
            // 60 = 1 heure par défaut
            $table->unsignedInteger('duree_levee')
                  ->default(60)
                  ->after('heure')
                  ->comment('Durée de la levée de corps en minutes');
        });
    }

    public function down(): void
    {
        Schema::table('sorties', function (Blueprint $table) {
            $table->dropColumn('duree_levee');
        });
    }
};