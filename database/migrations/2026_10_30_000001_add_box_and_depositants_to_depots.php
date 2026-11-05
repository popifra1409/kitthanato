<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('depots', function (Blueprint $table) {
            if (!Schema::hasColumn('depots', 'box_name')) {
                $table->string('box_name', 100)->nullable()->after('emplacement');
            }
        });

        if (!Schema::hasTable('depositants')) {
            Schema::create('depositants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
                $table->string('nom', 150);
                $table->string('telephone', 30);
                $table->string('cni', 50)->nullable();
                $table->string('lien_parente', 100)->nullable();
                $table->enum('statut', ['principal', 'secondaire'])->default('secondaire');
                $table->timestamps();
                $table->index(['depot_id', 'statut']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('depositants');
        Schema::table('depots', function (Blueprint $table) {
            if (Schema::hasColumn('depots', 'box_name')) {
                $table->dropColumn('box_name');
            }
        });
    }
};
