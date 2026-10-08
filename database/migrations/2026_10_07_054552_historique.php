<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('audit_logs')) {

            Schema::create('audit_logs', function (Blueprint $table) {

                $table->id();

                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('module', 100);

                $table->string('action', 100);

                $table->text('description')->nullable();

                $table->ipAddress('ip_address')->nullable();

                $table->jsonb('details')->nullable();

                $table->timestamps();

                $table->index('module');
                $table->index('action');
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};