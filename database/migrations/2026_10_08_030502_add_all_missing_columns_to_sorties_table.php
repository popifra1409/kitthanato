<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sorties', function (Blueprint $table) {

            /* ---------- JOURS DE CONSERVATION ---------- */
            if (!Schema::hasColumn('sorties', 'jours')) {
                $table->integer('jours')->default(0);
            }

            /* ---------- CAISSE (emplacement d'origine) ---------- */
            if (!Schema::hasColumn('sorties', 'caisse')) {
                $table->string('caisse')->nullable();
            }

            /* ---------- PRESTATIONS (JSON) ---------- */
            if (!Schema::hasColumn('sorties', 'prestations')) {
                $table->jsonb('prestations')->nullable();
            }

            /* ---------- MONTANTS DÉTAILLÉS ---------- */
            if (!Schema::hasColumn('sorties', 'montant_prestations')) {
                $table->decimal('montant_prestations', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_nuits')) {
                $table->decimal('montant_nuits', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_chapelle')) {
                $table->decimal('montant_chapelle', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_total')) {
                $table->decimal('montant_total', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('sorties', 'montant_paye')) {
                $table->decimal('montant_paye', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('sorties', 'reste_a_payer')) {
                $table->decimal('reste_a_payer', 12, 2)->default(0);
            }

            /* ---------- CHAPELLE ---------- */
            if (!Schema::hasColumn('sorties', 'chapelle_id')) {
                $table->unsignedBigInteger('chapelle_id')->nullable();
            }

            if (!Schema::hasColumn('sorties', 'chapelle_nom')) {
                $table->string('chapelle_nom')->nullable();
            }

            if (!Schema::hasColumn('sorties', 'chapelle_prix')) {
                $table->decimal('chapelle_prix', 12, 2)->default(0);
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
                'jours',
                'caisse',
                'prestations',
                'montant_prestations',
                'montant_nuits',
                'montant_chapelle',
                'montant_total',
                'montant_paye',
                'reste_a_payer',
                'chapelle_id',
                'chapelle_nom',
                'chapelle_prix',
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