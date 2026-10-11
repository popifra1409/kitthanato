<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Support\PermissionRegistrar;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Permissions + rôles par défaut (ADMIN, USER1, USER2)
        PermissionRegistrar::sync();

        // Compte administrateur initial (à changer après la première connexion)
        User::firstOrCreate(
            ['name' => 'Administrateur'],
            [
                'password' => 'Admin@1234',
                'role_id' => Role::where('code', config('permissions.super_admin_role'))->value('id'),
                'is_active' => true,
            ]
        );
    }
}
