<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Garde : la colonne existe déjà si create_transferts_table est récente.
        if (!Schema::hasColumn('transferts', 'emplacement_destination')) {
            Schema::table('transferts', function (Blueprint $table) {
                $table->string('emplacement_destination')->nullable()->after('destination');
            });
        }
    }

    public function down(): void
    {
        Schema::table('transferts', function (Blueprint $table) {
            $table->dropColumn('emplacement_destination');
        });
    }
};