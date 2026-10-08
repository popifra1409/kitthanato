<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('finance_to_sortie')) {
            Schema::create('finance_to_sortie', function (Blueprint $table) {
                $table->id();

                $table->foreignId('sortie_id')
                    ->constrained('sorties')
                    ->cascadeOnDelete();

                $table->integer('jours')->default(0);

                $table->decimal('montant_prestations', 12, 2)->default(0);
                $table->decimal('montant_nuits', 12, 2)->default(0);
                $table->decimal('montant_chapelle', 12, 2)->default(0);

                $table->decimal('montant_total', 12, 2)->default(0);
                $table->decimal('montant_paye', 12, 2)->default(0);
                $table->decimal('reste_a_payer', 12, 2)->default(0);

                $table->string('caisse')->nullable();
                $table->string('chapelle')->nullable();

                $table->jsonb('prestations')->nullable();

                $table->timestamps();
            });

            return;
        }

        $columns = [
            'sortie_id',
            'jours',
            'montant_prestations',
            'montant_nuits',
            'montant_chapelle',
            'montant_total',
            'montant_paye',
            'reste_a_payer',
            'caisse',
            'chapelle',
            'prestations'
        ];

        foreach ($columns as $column) {
            if (!Schema::hasColumn('finance_to_sortie', $column)) {

                Schema::table('finance_to_sortie', function (Blueprint $table) use ($column) {

                    if ($column === 'sortie_id') {
                        $table->foreignId('sortie_id')
                            ->nullable()
                            ->constrained('sorties')
                            ->cascadeOnDelete();

                    } elseif ($column === 'jours') {
                        $table->integer('jours')->default(0);

                    } elseif (in_array($column, [
                        'montant_prestations',
                        'montant_nuits',
                        'montant_chapelle',
                        'montant_total',
                        'montant_paye',
                        'reste_a_payer'
                    ])) {
                        $table->decimal($column, 12, 2)->default(0);

                    } elseif ($column === 'prestations') {
                        $table->jsonb('prestations')->nullable();

                    } else {
                        $table->string($column)->nullable();
                    }
                });
            }
        }
    }

    public function down()
    {
        // Ne pas supprimer automatiquement la table existante.
    }
};