<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Support\PermissionRegistrar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        PermissionRegistrar::sync();
    }

    protected function connecter(string $role = 'ADMIN', array $attrs = []): User
    {
        $user = User::factory()->role($role)->create($attrs);
        Sanctum::actingAs($user);
        return $user;
    }

    protected function depotValide(array $surcharges = []): array
    {
        return array_merge([
            'code' => '26PA' . random_int(100, 99999),
            'nom' => 'DOE',
            'prenom' => 'John',
            'sexe' => 'M',
            'age' => 60,
            'date_deces' => now()->subDay()->toDateString(),
            'date_arrivee' => now()->toDateString(),
            'heure_arrivee' => '10:00',
            'provenance' => 'Interne',
            'motif' => 'Conservation',
            'emplacement' => 'Caisse 1',
            'chapelle' => 'Aucune',
            'contact_nom' => 'Jane Doe',
            'contact_telephone' => '699000000',
        ], $surcharges);
    }
}
