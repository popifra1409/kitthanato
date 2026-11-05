
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nom_certificats', function (Blueprint $table) {
            $table->id();

            $table->string('nom');
            $table->enum('type', ['soussigne', 'constat']);

            $table->timestamps();

            $table->unique(['nom', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nom_certificats');
    }
};
