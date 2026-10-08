<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('prestations')) {

            Schema::create('prestations', function (Blueprint $table) {
                $table->id();
                $table->string('nom', 150)->unique();
                $table->decimal('prix', 12, 2)->default(0);
                $table->boolean('actif')->default(true);
                $table->timestamps();
            });

        } else {

            Schema::table('prestations', function (Blueprint $table) {

                if (!Schema::hasColumn('prestations', 'nom')) {
                    $table->string('nom', 150)->nullable();
                }

                if (!Schema::hasColumn('prestations', 'prix')) {
                    $table->decimal('prix', 12, 2)->default(0);
                }

                if (!Schema::hasColumn('prestations', 'actif')) {
                    $table->boolean('actif')->default(true);
                }

            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('prestations');
    }
};