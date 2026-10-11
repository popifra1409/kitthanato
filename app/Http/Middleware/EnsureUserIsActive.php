<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque immédiatement un compte désactivé, même s'il possède encore
 * un token valide.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->is_active) {
            $user->currentAccessToken()?->delete();

            return response()->json([
                'message' => 'Votre compte est désactivé. Contactez un administrateur.',
            ], 401);
        }

        return $next($request);
    }
}
