<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
{
    Schema::table('depots', function (Blueprint $table) {
        $table->boolean('scelle')->default(false);
        $table->foreignId('scelle_par')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamp('scelle_le')->nullable();
    });
}

public function down(): void
{
    Schema::table('depots', function (Blueprint $table) {
        $table->dropConstrainedForeignId('scelle_par');
        $table->dropColumn(['scelle', 'scelle_le']);
    });
}
};