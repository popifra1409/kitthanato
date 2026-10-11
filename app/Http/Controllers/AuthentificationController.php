<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthentificationController extends Controller
{
    /**
     * CONNEXION
     * POST /api/login
     */
    public function login(Request $request)
    {
        $donnees = $request->validate([
            'name' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with('roleModel')
            ->where('name', $donnees['name'])
            ->first();

        if (!$user || !Hash::check($donnees['password'], $user->password)) {
            Audit::log('AUTHENTIFICATION', 'ECHEC_CONNEXION',
                "Tentative de connexion échouée pour « {$donnees['name']} »");

            return response()->json([
                'message' => 'Nom de compte ou mot de passe incorrect.',
            ], 401);
        }

        if (!$user->is_active) {
            Audit::log('AUTHENTIFICATION', 'ECHEC_CONNEXION',
                "Connexion refusée : compte « {$user->name} » désactivé", [], $user, $user);

            return response()->json([
                'message' => 'Ce compte est désactivé. Contactez un administrateur.',
            ], 403);
        }

        // Une seule session active par compte
        $user->tokens()->delete();

        $token = $user->createToken('thanato-token')->plainTextToken;

        // Mise à jour silencieuse (pas d'entrée MODIFICATION dans le journal)
        User::withoutEvents(fn () => $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->saveQuietly());

        Audit::log('AUTHENTIFICATION', 'CONNEXION',
            "Connexion de {$user->name}", [], $user, $user);

        return response()->json([
            'message' => 'Connexion réussie.',
            'token' => $token,
            'user' => $user->toAuthPayload(),
        ]);
    }

    /**
     * DÉCONNEXION
     * POST /api/logout
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        Audit::log('AUTHENTIFICATION', 'DECONNEXION', "Déconnexion de {$user->name}", [], $user);

        $user->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    /**
     * UTILISATEUR CONNECTÉ (+ permissions)
     * GET /api/me
     */
    public function me(Request $request)
    {
        return response()->json(
            $request->user()->load('roleModel')->toAuthPayload()
        );
    }

    /**
     * CHANGER SON PROPRE MOT DE PASSE
     * PUT /api/me/password
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'confirmed', Password::min(6)],
        ], [
            'current_password.current_password' => 'Le mot de passe actuel est incorrect.',
        ]);

        $user->password = $data['password'];
        $user->save();

        Audit::log('UTILISATEURS', 'MOT_DE_PASSE', "{$user->name} a changé son mot de passe", [], $user);

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
}
