<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie que l'utilisateur connecté possède au moins une des permissions.
 *
 *   ->middleware('permission:depots.view')
 *   ->middleware('permission:depots.create|depots.update')
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $liste = collect($permissions)
            ->flatMap(fn ($p) => explode('|', $p))
            ->map(fn ($p) => trim($p))
            ->filter()
            ->all();

        if ($liste && !$user->hasPermission($liste)) {
            return response()->json([
                'message' => 'Accès refusé : permission requise (' . implode(' ou ', $liste) . ').',
            ], 403);
        }

        return $next($request);
    }
}
