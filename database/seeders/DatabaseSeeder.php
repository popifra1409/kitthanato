<?php

namespace Database\Seeders;

use App\Support\PermissionRegistrar;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Permissions + rôles par défaut (ADMIN, USER1, USER2)
        PermissionRegistrar::sync();

        // Super administrateur (identifiants : voir SuperAdminSeeder / .env)
        $this->call(SuperAdminSeeder::class);
    }
}
