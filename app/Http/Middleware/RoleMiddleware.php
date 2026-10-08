<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(
        Request $request,
        Closure $next,
        ...$roles
    ): Response {

        if (!$request->user()) {
            return response()->json([
                'message' => 'Non authentifié.'
            ], 401);
        }

        $role = strtoupper(
            trim($request->user()->role ?? '')
        );

        $rolesAutorises = array_map(
            fn ($role) => strtoupper(trim($role)),
            $roles
        );

        if (!in_array($role, $rolesAutorises, true)) {
            return response()->json([
                'message' => 'Accès refusé.'
            ], 403);
        }

        return $next($request);
    }
}