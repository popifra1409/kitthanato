
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificat_genre_morts', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('depot_id')->unique();

            $table->json('donnees');
            $table->json('genres')->nullable();

            $table->timestamps();

            $table->foreign('depot_id')
                ->references('id')
                ->on('depots')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificat_genre_morts');
    }
};
