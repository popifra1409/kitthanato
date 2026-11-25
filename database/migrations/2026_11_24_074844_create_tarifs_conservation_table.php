<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
public function up(): void
{
    Schema::create('tarifs_conservation', function (Blueprint $table) {
        $table->id();
        $table->string('emplacement')->unique();
        $table->decimal('prix', 12, 2)->default(0);   // prix par jour
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('updated_by')->nullable();
        $table->timestamps();
    });

    $now = now();
    DB::table('tarifs_conservation')->insert([
        ['emplacement' => 'Chambre froide individuelle', 'prix' => 10000, 'created_at' => $now, 'updated_at' => $now],
        ['emplacement' => 'Chambre froide commune',      'prix' => 10000, 'created_at' => $now, 'updated_at' => $now],
    ]);
}

public function down(): void
{
    Schema::dropIfExists('tarifs_conservation');
}
};