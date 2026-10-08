<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('depots', 'code_defunt')) {
            Schema::table('depots', function (Blueprint $table) {
                $table->string('code_defunt')->nullable()->after('code');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('depots', 'code_defunt')) {
            Schema::table('depots', function (Blueprint $table) {
                $table->dropColumn('code_defunt');
            });
        }
    }
};