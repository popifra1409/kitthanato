<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transferts', function (Blueprint $table) {
            $table->string('provenance')->nullable()->after('depot_id');
        });
    }

    public function down(): void
    {
        Schema::table('transferts', function (Blueprint $table) {
            $table->dropColumn('provenance');
        });
    }
};