<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // admin
        User::create(['name'=>'Administrateur',
        'password'=> Hash::make('Admin@1234'),
        'role' =>'ADMIN',]);

    
    }
}
