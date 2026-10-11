<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        /*
         * Les permissions dynamiques (table permissions) sont branchées sur
         * le Gate de Laravel : $user->can('depots.create'), @can, authorize()
         * et le middleware 'can:' fonctionnent avec les codes de permission.
         */
        Gate::before(function (User $user, string $ability) {
            if (str_contains($ability, '.')) {
                return $user->hasPermission($ability) ?: null;
            }
            return null;
        });
    }
}
