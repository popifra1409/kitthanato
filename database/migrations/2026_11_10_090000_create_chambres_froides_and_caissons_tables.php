<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
| Emplacements des corps : chambres froides (communes ou individuelles)
| et leurs caissons (A1, A2, ...). Une chambre possède ses propres
| caissons ; le code n'est donc unique qu'à l'intérieur d'une chambre.
*/
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chambres_froides', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100)->unique();
            $table->string('type', 20)->default('commune');
            $table->string('description', 255)->nullable();
            $table->boolean('actif')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('caissons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chambre_froide_id')
                ->constrained('chambres_froides')
                ->cascadeOnDelete();
            $table->string('code', 20);
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('actif')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['chambre_froide_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caissons');
        Schema::dropIfExists('chambres_froides');
    }
};
