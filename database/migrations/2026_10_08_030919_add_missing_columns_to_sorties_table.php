<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sorties', function (Blueprint $table) {

            /* ---------- PRESTATIONS (JSON) ---------- */
            if (!Schema::hasColumn('sorties', 'prestations')) {
                $table->jsonb('prestations')->nullable();
            }

            /* ---------- CHAPELLE (id + nom) ---------- */
            if (!Schema::hasColumn('sorties', 'chapelle_id')) {
                $table->unsignedBigInteger('chapelle_id')->nullable();
            }

            if (!Schema::hasColumn('sorties', 'chapelle_nom')) {
                $table->string('chapelle_nom')->nullable();
            }

            /* ---------- CNI RÉCUPÉRATEUR ---------- */
            if (!Schema::hasColumn('sorties', 'recuperateur_cni')) {
                $table->string('recuperateur_cni')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('sorties', function (Blueprint $table) {
            $columns = [
                'prestations',
                'chapelle_id',
                'chapelle_nom',
                'recuperateur_cni',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('sorties', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};