<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('chapelles')) {

            Schema::create('chapelles', function (Blueprint $table) {
                $table->id();
                $table->string('nom', 150)->unique();
                $table->decimal('prix', 12, 2)->default(0);
                $table->boolean('actif')->default(true);
                $table->timestamps();
            });

        } else {

            Schema::table('chapelles', function (Blueprint $table) {

                if (!Schema::hasColumn('chapelles', 'nom')) {
                    $table->string('nom', 150)->nullable();
                }

                if (!Schema::hasColumn('chapelles', 'prix')) {
                    $table->decimal('prix', 12, 2)->default(0);
                }

                if (!Schema::hasColumn('chapelles', 'actif')) {
                    $table->boolean('actif')->default(true);
                }

            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('chapelles');
    }
};