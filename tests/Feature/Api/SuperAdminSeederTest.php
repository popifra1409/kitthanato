<?php

namespace Tests\Feature\Api;

use App\Models\Permission;
use App\Models\User;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

class SuperAdminSeederTest extends ApiTestCase
{
    public function test_le_seeder_cree_un_super_admin_actif_avec_toutes_les_permissions(): void
    {
        $this->seed(SuperAdminSeeder::class);

        $admin = User::where('name', 'superadmin')->firstOrFail();

        $this->assertTrue($admin->is_active);
        $this->assertTrue($admin->isSuperAdmin());
        $this->assertTrue(Hash::check('SuperAdmin@2026', $admin->password));
        $this->assertSame(Permission::count(), $admin->roleModel->permissions()->count());

        foreach (Permission::pluck('code') as $code) {
            $this->assertTrue($admin->hasPermission($code), "Permission manquante : {$code}");
        }

        $this->assertDatabaseHas('audit_logs', ['action' => 'SEED_SUPER_ADMIN']);
    }

    public function test_connexion_du_super_admin_via_l_api(): void
    {
        $this->seed(SuperAdminSeeder::class);

        $res = $this->postJson('/api/login', ['name' => 'superadmin', 'password' => 'SuperAdmin@2026'])
            ->assertOk()
            ->assertJsonPath('user.role', 'ADMIN');

        $this->assertContains('*', $res->json('user.permissions'));
    }

    public function test_le_super_admin_accede_a_toutes_les_routes_de_l_api(): void
    {
        $this->seed(SuperAdminSeeder::class);
        Sanctum::actingAs(User::where('name', 'superadmin')->first());

        $routes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($r) => str_starts_with($r->uri(), 'api/')
                && in_array('GET', $r->methods(), true)
                && in_array('auth:sanctum', $r->gatherMiddleware(), true));

        $this->assertGreaterThan(20, $routes->count());

        foreach ($routes as $route) {
            // Paramètres d'URL ({id}, {chapelle}...) remplacés par 1 : un 404 est accepté,
            // l'important est qu'aucune route ne refuse l'accès.
            $url = '/' . preg_replace('/\{[^}]+\}/', '1', $route->uri());
            $status = $this->getJson($url)->status();

            $this->assertNotContains($status, [401, 403], "Accès refusé au super admin sur GET {$url} ({$status})");
        }
    }

    public function test_le_seeder_repare_un_super_admin_supprime_ou_desactive_et_peut_etre_relance(): void
    {
        $this->seed(SuperAdminSeeder::class);
        $admin = User::where('name', 'superadmin')->first();

        $admin->forceFill(['is_active' => false, 'role_id' => \App\Models\Role::where('code', 'USER1')->value('id')])->saveQuietly();
        $admin->delete();

        $this->seed(SuperAdminSeeder::class);

        $admin = User::where('name', 'superadmin')->first();
        $this->assertNotNull($admin, 'Le compte doit être restauré');
        $this->assertTrue($admin->is_active);
        $this->assertTrue($admin->isSuperAdmin());
        $this->assertSame(1, User::withTrashed()->where('name', 'superadmin')->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'REPARATION_SUPER_ADMIN']);
    }
}
