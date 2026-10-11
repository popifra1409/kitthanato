<?php

namespace Tests\Feature\Api;

use App\Models\Historique;
use App\Models\Role;
use App\Models\User;

class GestionUtilisateursEtRolesTest extends ApiTestCase
{
    public function test_creer_un_utilisateur_avec_code_de_role_et_tracer_le_createur(): void
    {
        $admin = $this->connecter('ADMIN');

        $res = $this->postJson('/api/utilisateurs', [
            'name' => 'nouveau',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => 'user2',
        ])->assertCreated()
          ->assertJsonPath('user.role', 'USER2')
          ->assertJsonPath('user.createur.name', $admin->name);

        $this->assertSame($admin->id, User::find($res->json('user.id'))->created_by);
        $this->assertDatabaseHas('audit_logs', ['module' => 'UTILISATEURS', 'action' => 'CREATION', 'user_id' => $admin->id]);
    }

    public function test_le_mot_de_passe_n_apparait_jamais_dans_le_journal(): void
    {
        $this->connecter('ADMIN');

        $this->postJson('/api/utilisateurs', [
            'name' => 'secret', 'password' => 'secret123', 'password_confirmation' => 'secret123', 'role' => 'USER1',
        ])->assertCreated();

        foreach (Historique::all() as $log) {
            $this->assertStringNotContainsString('password', json_encode($log->details));
        }
    }

    public function test_impossible_de_supprimer_ou_retrograder_le_dernier_admin(): void
    {
        $admin = $this->connecter('ADMIN');

        $this->deleteJson("/api/utilisateurs/{$admin->id}")->assertStatus(422);

        $this->putJson("/api/utilisateurs/{$admin->id}", ['name' => $admin->name, 'role' => 'USER1'])
            ->assertStatus(422);
    }

    public function test_suppression_logique_conserve_la_tracabilite(): void
    {
        $this->connecter('ADMIN');
        $cible = User::factory()->role('USER1')->create();

        $this->deleteJson("/api/utilisateurs/{$cible->id}")->assertOk();

        $this->assertSoftDeleted('users', ['id' => $cible->id]);
        $this->getJson('/api/utilisateurs')->assertJsonMissing(['id' => $cible->id]);
    }

    public function test_desactiver_un_compte_coupe_ses_sessions(): void
    {
        $this->connecter('ADMIN');
        $cible = User::factory()->role('USER1')->create();
        $cible->createToken('t');

        $this->postJson("/api/utilisateurs/{$cible->id}/toggle-actif")
            ->assertOk()->assertJsonPath('user.is_active', false);

        $this->assertSame(0, $cible->tokens()->count());
    }

    public function test_un_non_admin_ne_peut_pas_creer_d_admin(): void
    {
        $role = Role::create(['code' => 'RH', 'libelle' => 'RH']);
        $role->permissions()->sync(\App\Models\Permission::whereIn('code', ['utilisateurs.view', 'utilisateurs.create'])->pluck('id'));
        $this->connecter('RH');

        $this->postJson('/api/utilisateurs', [
            'name' => 'pirate', 'password' => 'secret123', 'password_confirmation' => 'secret123', 'role' => 'ADMIN',
        ])->assertStatus(422);
    }

    public function test_crud_role_et_journal_des_permissions(): void
    {
        $this->connecter('ADMIN');

        $id = $this->postJson('/api/roles', [
            'code' => 'caissier',
            'libelle' => 'Caissier',
            'permissions' => ['sorties.view', 'sorties.payer'],
        ])->assertCreated()
          ->assertJsonPath('role.code', 'CAISSIER')
          ->json('role.id');

        $this->putJson("/api/roles/{$id}", [
            'code' => 'CAISSIER',
            'libelle' => 'Caissier principal',
            'permissions' => ['sorties.view'],
        ])->assertOk();

        $log = Historique::where('action', 'PERMISSIONS')->latest('id')->first();
        $this->assertSame(['sorties.payer'], $log->details['retirees']);

        // Dépendance ajoutée automatiquement : sorties.view ⇒ depots.view
        $this->assertContains('depots.view', \App\Models\Role::find($id)->permissions()->pluck('code')->all());

        $this->deleteJson("/api/roles/{$id}")->assertOk();
    }

    public function test_un_role_systeme_ou_utilise_ne_peut_pas_etre_supprime(): void
    {
        $this->connecter('ADMIN');

        $user1 = Role::where('code', 'USER1')->first();
        $this->deleteJson("/api/roles/{$user1->id}")->assertStatus(422);

        $role = Role::create(['code' => 'TEMP', 'libelle' => 'Temp']);
        User::factory()->create(['role_id' => $role->id]);
        $this->deleteJson("/api/roles/{$role->id}")->assertStatus(422);
    }

    public function test_les_permissions_du_super_admin_ne_peuvent_pas_etre_retirees(): void
    {
        $this->connecter('ADMIN');
        $admin = Role::where('code', 'ADMIN')->first();

        $this->putJson("/api/roles/{$admin->id}", ['libelle' => 'Admin', 'permissions' => []])->assertOk();

        $this->assertSame(\App\Models\Permission::count(), $admin->permissions()->count());
    }

    public function test_catalogue_des_permissions_groupe_par_module(): void
    {
        $this->connecter('ADMIN');

        $res = $this->getJson('/api/permissions')
            ->assertOk()
            ->assertJsonFragment(['module' => 'depots', 'libelle' => 'Dépôts de corps']);

        $this->assertSame(['sorties.view', 'depots.view'], $res->json('dependances')['sorties.payer']);
    }
}
