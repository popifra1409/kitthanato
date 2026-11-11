<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('depots', function (Blueprint $table) {
            $table->foreignId('caisson_id')
                ->nullable()
                ->constrained('caissons')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('depots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('caisson_id');
        });
    }
};
