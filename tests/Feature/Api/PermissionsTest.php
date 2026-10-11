<?php

namespace Tests\Feature\Api;

use App\Models\Depot;
use App\Models\Role;

class PermissionsTest extends ApiTestCase
{
    public function test_user1_gere_les_depots_mais_pas_les_sorties_ni_l_admin(): void
    {
        $this->connecter('USER1');

        $this->getJson('/api/depots')->assertOk();
        $this->postJson('/api/depots', $this->depotValide())->assertCreated();
        $this->getJson('/api/levees')->assertOk();

        $this->getJson('/api/sorties')->assertForbidden();
        $this->getJson('/api/declarations')->assertForbidden();
        $this->getJson('/api/utilisateurs')->assertForbidden();
        $this->getJson('/api/historique')->assertForbidden();
    }

    public function test_user1_ne_peut_pas_supprimer_un_depot(): void
    {
        $this->connecter('USER1');
        $depot = Depot::create($this->depotValide());

        $this->deleteJson("/api/depots/{$depot->id}")->assertForbidden();
        $this->assertDatabaseHas('depots', ['id' => $depot->id]);
    }

    public function test_user2_accede_aux_declarations(): void
    {
        $this->connecter('USER2');

        $this->getJson('/api/declarations')->assertOk();
        $this->getJson('/api/declarations/dashboard')->assertOk();
        $this->getJson('/api/transferts')->assertForbidden();
    }

    public function test_admin_a_acces_a_tout(): void
    {
        $this->connecter('ADMIN');

        foreach (['/api/depots', '/api/sorties', '/api/transferts', '/api/declarations',
                  '/api/statistiques', '/api/utilisateurs', '/api/roles', '/api/permissions',
                  '/api/historique', '/api/corbeille', '/api/prestations-admin', '/api/chapelles-admin'] as $url) {
            $this->getJson($url)->assertOk();
        }
    }

    public function test_une_permission_ajoutee_au_role_est_effective_immediatement(): void
    {
        $user = $this->connecter('USER1');
        $this->getJson('/api/sorties')->assertForbidden();

        $role = Role::where('code', 'USER1')->first();
        $role->permissions()->attach(\App\Models\Permission::where('code', 'sorties.view')->value('id'));

        // Chaque requête HTTP réelle recharge l'utilisateur ; on simule ça ici.
        \Laravel\Sanctum\Sanctum::actingAs($user->fresh());

        $this->getJson('/api/sorties')->assertOk();
    }

    public function test_gate_laravel_reconnait_les_codes_de_permission(): void
    {
        $user = $this->connecter('USER2');

        $this->assertTrue($user->can('declarations.create'));
        $this->assertFalse($user->can('sorties.payer'));
    }
}
