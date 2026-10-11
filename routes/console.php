<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Synchronise le catalogue config/permissions.php avec la base.
|   php artisan permissions:sync
|   php artisan permissions:sync --reset-roles   (réapplique les droits par défaut)
*/
Artisan::command('permissions:sync {--reset-roles : Réapplique les permissions par défaut des rôles système}', function () {
    $resultat = \App\Support\PermissionRegistrar::sync((bool) $this->option('reset-roles'));
    $this->info("{$resultat['permissions']} permissions synchronisées, {$resultat['roles']} rôle(s) créé(s).");
})->purpose('Synchronise les permissions et rôles par défaut');
