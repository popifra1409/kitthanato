<?php

namespace Tests\Feature\Api;

use App\Models\Historique;
use App\Models\User;

class AuthentificationTest extends ApiTestCase
{
    public function test_login_renvoie_token_role_et_permissions(): void
    {
        User::factory()->role('USER1')->create(['name' => 'thanato', 'password' => 'secret123']);

        $res = $this->postJson('/api/login', ['name' => 'thanato', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('user.role', 'USER1')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'role', 'role_libelle', 'permissions']]);

        $this->assertContains('depots.create', $res->json('user.permissions'));
        $this->assertNotContains('sorties.view', $res->json('user.permissions'));

        $this->assertDatabaseHas('audit_logs', ['action' => 'CONNEXION', 'user_name' => 'thanato']);
        $this->assertNotNull(User::where('name', 'thanato')->value('last_login_at'));
    }

    public function test_login_echoue_avec_mauvais_mot_de_passe_et_est_journalise(): void
    {
        User::factory()->role('USER1')->create(['name' => 'thanato', 'password' => 'secret123']);

        $this->postJson('/api/login', ['name' => 'thanato', 'password' => 'faux'])->assertStatus(401);

        $this->assertDatabaseHas('audit_logs', ['action' => 'ECHEC_CONNEXION']);
    }

    public function test_compte_desactive_ne_peut_pas_se_connecter(): void
    {
        User::factory()->role('USER1')->inactive()->create(['name' => 'off', 'password' => 'secret123']);

        $this->postJson('/api/login', ['name' => 'off', 'password' => 'secret123'])->assertStatus(403);
    }

    public function test_token_d_un_compte_desactive_est_refuse(): void
    {
        $user = $this->connecter('ADMIN');
        $user->forceFill(['is_active' => false])->saveQuietly();

        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_les_routes_metier_exigent_un_token(): void
    {
        foreach (['/api/depots', '/api/sorties', '/api/transferts', '/api/declarations', '/api/prestations'] as $url) {
            $this->getJson($url)->assertStatus(401);
        }
    }

    public function test_me_renvoie_les_permissions_admin_avec_joker(): void
    {
        $this->connecter('ADMIN');

        $this->assertContains('*', $this->getJson('/api/me')->assertOk()->json('permissions'));
    }

    public function test_changement_de_mot_de_passe(): void
    {
        $user = $this->connecter('USER1', ['password' => 'ancien123']);

        $this->putJson('/api/me/password', [
            'current_password' => 'mauvais',
            'password' => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ])->assertStatus(422);

        $this->putJson('/api/me/password', [
            'current_password' => 'ancien123',
            'password' => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ])->assertOk();

        $this->assertTrue(\Hash::check('nouveau123', $user->fresh()->password));
        $this->assertSame(1, Historique::where('action', 'MOT_DE_PASSE')->count());
    }
}
