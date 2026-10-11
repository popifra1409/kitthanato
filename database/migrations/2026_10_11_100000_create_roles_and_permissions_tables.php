<?php

use App\Support\PermissionRegistrar;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
| Rôles & permissions dynamiques.
|
| - roles / permissions / permission_role
| - users.role_id (remplace l'ancienne colonne texte users.role)
| - users.is_active, last_login_at, last_login_ip, deleted_at
|
| Les valeurs existantes de users.role (ADMIN, USER1, USER2, ...) sont
| converties en rôles, et chaque utilisateur est rattaché au bon rôle.
*/
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('libelle', 150);
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('module', 50)->index();
            $table->string('libelle', 150);
            $table->timestamps();
        });

        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('password')
                ->constrained('roles')->restrictOnDelete();
            $table->boolean('is_active')->default(true)->after('role_id');
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->softDeletes();
        });

        /* 1. Catalogue de permissions + rôles par défaut */
        PermissionRegistrar::sync();

        /* 2. Rôles « inconnus » éventuellement présents en base */
        if (Schema::hasColumn('users', 'role')) {
            $codes = DB::table('users')
                ->whereNotNull('role')
                ->pluck('role')
                ->map(fn ($r) => strtoupper(trim($r)))
                ->filter()
                ->unique();

            foreach ($codes as $code) {
                DB::table('roles')->insertOrIgnore([
                    'code' => $code,
                    'libelle' => $code,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            /* 3. Rattacher chaque utilisateur à son rôle */
            $roles = DB::table('roles')->pluck('id', 'code');

            DB::table('users')->orderBy('id')->each(function ($user) use ($roles) {
                $code = strtoupper(trim((string) $user->role));
                DB::table('users')->where('id', $user->id)->update([
                    'role_id' => $roles[$code] ?? $roles['USER2'] ?? null,
                ]);
            });

            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('USER2')->after('password');
        });

        $roles = DB::table('roles')->pluck('code', 'id');
        DB::table('users')->orderBy('id')->each(function ($user) use ($roles) {
            DB::table('users')->where('id', $user->id)
                ->update(['role' => $roles[$user->role_id] ?? 'USER2']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
            $table->dropColumn(['is_active', 'last_login_at', 'last_login_ip', 'deleted_at']);
        });

        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
