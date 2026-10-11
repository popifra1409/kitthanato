<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
| Correctif : SESSION_DRIVER=database mais la table « sessions » n'était
| créée par aucune migration. Maintenant que Laravel sert aussi les pages
| React (routes web), elle est indispensable. Sans effet si elle existe.
*/
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sessions')) {
            return;
        }

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        // Volontairement vide (la table pouvait exister avant ce correctif).
    }
};
