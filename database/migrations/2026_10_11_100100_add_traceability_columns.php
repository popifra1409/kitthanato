<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
| Traçabilité « qui a fait quoi » :
| created_by / updated_by sur toutes les tables métier et de référence,
| et enrichissement du journal d'audit (audit_logs).
*/
return new class extends Migration
{
    private array $tables = [
        'users',
        'roles',
        'depots',
        'sorties',
        'levees',
        'transferts',
        'prestations',
        'chapelles',
        'professions',
        'services',
        'declaration_deces',
        'finance_to_sortie',
    ];

    public function up(): void
    {
        foreach ($this->tables as $nom) {
            if (!Schema::hasTable($nom)) {
                continue;
            }

            Schema::table($nom, function (Blueprint $table) use ($nom) {
                if (!Schema::hasColumn($nom, 'created_by')) {
                    $table->foreignId('created_by')->nullable()
                        ->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn($nom, 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()
                        ->constrained('users')->nullOnDelete();
                }
            });
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('audit_logs', 'auditable_type')) {
                $table->string('auditable_type')->nullable()->after('action');
                $table->unsignedBigInteger('auditable_id')->nullable()->after('auditable_type');
                $table->index(['auditable_type', 'auditable_id']);
            }
            if (!Schema::hasColumn('audit_logs', 'user_agent')) {
                $table->string('user_agent', 255)->nullable()->after('ip_address');
            }
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['auditable_type', 'auditable_id']);
            $table->dropColumn(['auditable_type', 'auditable_id', 'user_agent']);
        });

        foreach ($this->tables as $nom) {
            if (!Schema::hasTable($nom)) {
                continue;
            }
            Schema::table($nom, function (Blueprint $table) use ($nom) {
                foreach (['created_by', 'updated_by'] as $col) {
                    if (Schema::hasColumn($nom, $col)) {
                        $table->dropConstrainedForeignId($col);
                    }
                }
            });
        }
    }
};
