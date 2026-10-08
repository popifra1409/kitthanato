<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('depots', 'contact_cni')) {
            Schema::table('depots', function (Blueprint $table) {
                $table->string('contact_cni', 50)
                    ->nullable()
                    ->after('contact_telephone');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('depots', 'contact_cni')) {
            Schema::table('depots', function (Blueprint $table) {
                $table->dropColumn('contact_cni');
            });
        }
    }
};