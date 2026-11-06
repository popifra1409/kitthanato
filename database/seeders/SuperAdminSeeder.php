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
 *  - le mot de passe est celui de SUPER_ADMIN_PASSWORD s'il est renseigné ;
 *  - sinon, hors production, le mot de passe défini dans cette classe
 *    (MOT_DE_PASSE_LOCAL) est réappliqué à chaque exécution, y compris sur
 *    un compte existant : aucune variable .env n'est nécessaire ;
 *  - en production, sans SUPER_ADMIN_PASSWORD, le mot de passe d'un compte
 *    existant n'est pas écrasé ; à la création un mot de passe aléatoire
 *    est généré et affiché une seule fois dans la console.
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
            } elseif ($motDePasseEnv !== '' || !app()->environment('production')) {
                // Hors production, le seeder réimpose son mot de passe : le
                // compte reste accessible même si celui du compte est perdu.
                $motDePasse = $motDePasseEnv !== '' ? $motDePasseEnv : self::MOT_DE_PASSE_LOCAL;
                $user->password = $motDePasse;
                $motDePasseAffiche = $motDePasseEnv !== '' ? null : $motDePasse;
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
