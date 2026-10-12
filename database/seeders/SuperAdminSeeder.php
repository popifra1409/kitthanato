<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\Audit;
use App\Support\PermissionRegistrar;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Crée (ou répare) le compte SUPER ADMINISTRATEUR.
 *
 *   php artisan db:seed --class=SuperAdminSeeder
 *
 * Paramètres (.env, facultatifs) :
 *   SUPER_ADMIN_NAME=superadmin
 *   SUPER_ADMIN_PASSWORD=MotDePasseFort@2026
 *
 * Comportement :
 *  - synchronise d'abord toutes les permissions et le rôle ADMIN ;
 *  - le rôle ADMIN reçoit TOUTES les permissions ;
 *  - si le compte n'existe pas : il est créé ;
 *  - s'il existe (même supprimé ou désactivé) : il est restauré, réactivé
 *    et rattaché au rôle ADMIN ;
 *  - le mot de passe n'est (re)défini que si SUPER_ADMIN_PASSWORD est
 *    renseigné, ou à la création. Sans SUPER_ADMIN_PASSWORD, un mot de
 *    passe par défaut est utilisé en local, un mot de passe aléatoire
 *    en production — il est affiché une seule fois dans la console.
 *
 * Le seeder peut être relancé sans risque.
 */
class SuperAdminSeeder extends Seeder
{
    private const MOT_DE_PASSE_LOCAL = 'SuperAdmin@2026';

    public function run(): void
    {
        $nom = trim((string) env('SUPER_ADMIN_NAME', 'superadmin')) ?: 'superadmin';
        $motDePasseEnv = (string) env('SUPER_ADMIN_PASSWORD', '');

        DB::transaction(function () use ($nom, $motDePasseEnv) {
            // 1. Catalogue des permissions + rôles système
            PermissionRegistrar::sync();

            // 2. Rôle super-admin avec absolument toutes les permissions
            $role = Role::where('code', config('permissions.super_admin_role'))->firstOrFail();
            $role->permissions()->sync(Permission::pluck('id'));

            // 3. Compte (y compris s'il a été supprimé logiquement)
            $user = User::withTrashed()->where('name', $nom)->first();
            $creation = !$user;
            $motDePasseAffiche = null;

            if ($creation) {
                $motDePasse = $motDePasseEnv !== '' ? $motDePasseEnv : $this->motDePasseParDefaut();
                $motDePasseAffiche = $motDePasseEnv !== '' ? null : $motDePasse;

                $user = new User(['name' => $nom]);
                $user->password = $motDePasse;
            } elseif ($motDePasseEnv !== '') {
                $user->password = $motDePasseEnv;
            }

            if ($user->trashed()) {
                $user->restore();
            }

            $user->role_id = $role->id;
            $user->is_active = true;
            $user->save();

            Audit::log(
                'UTILISATEURS',
                $creation ? 'SEED_SUPER_ADMIN' : 'REPARATION_SUPER_ADMIN',
                ($creation ? 'Création' : 'Vérification / réparation') . " du super administrateur « {$nom} » (seeder)",
                ['permissions' => Permission::count()],
                $user
            );

            $this->afficherResume($user, $creation, $motDePasseAffiche, $motDePasseEnv !== '');
        });
    }

    private function motDePasseParDefaut(): string
    {
        return app()->environment('production')
            ? Str::password(16)
            : self::MOT_DE_PASSE_LOCAL;
    }

    private function afficherResume(User $user, bool $creation, ?string $motDePasse, bool $depuisEnv): void
    {
        if (!$this->command) {
            return;
        }

        $user->load('roleModel');

        $this->command->newLine();
        $this->command->info($creation ? '✔ Super administrateur créé' : '✔ Super administrateur vérifié / réparé');
        $this->command->table(['Champ', 'Valeur'], [
            ['Identifiant', $user->name],
            ['Mot de passe', match (true) {
                $motDePasse !== null => $motDePasse,
                $depuisEnv => '(SUPER_ADMIN_PASSWORD du .env)',
                default => '(inchangé)',
            }],
            ['Rôle', "{$user->roleModel->libelle} ({$user->roleModel->code})"],
            ['Permissions', Permission::count() . ' / ' . Permission::count() . ' (toutes)'],
            ['Actif', $user->is_active ? 'oui' : 'non'],
        ]);

        if ($motDePasse !== null) {
            $this->command->warn('Notez ce mot de passe et changez-le après la première connexion.');
        }
    }
}
