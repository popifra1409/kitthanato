<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthentificationController extends Controller
{
    /**
     * CONNEXION
     */
    public function login(Request $request)
    {
        $donnees = $request->validate([
            'name' => [
                'required',
                'string',
            ],

            'password' => [
                'required',
                'string',
            ],
        ]);

        $user = User::where(
            'name',
            $donnees['name']
        )->first();

        if (
            !$user ||
            !Hash::check(
                $donnees['password'],
                $user->password
            )
        ) {
            return response()->json([
                'message' =>
                    'Nom de compte ou mot de passe incorrect.'
            ], 401);
        }

        // Supprime les anciens tokens
        $user->tokens()->delete();

        // Création d'un nouveau token
        $token = $user
            ->createToken('thanato-token')
            ->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie.',

            'token' => $token,

            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => strtoupper($user->role),
            ],
        ]);
    }

    /**
     * DÉCONNEXION
     */
    public function logout(Request $request)
    {
        $request
            ->user()
            ?->currentAccessToken()
            ?->delete();

        return response()->json([
            'message' => 'Déconnexion réussie.'
        ]);
    }

    /**
     * UTILISATEUR CONNECTÉ
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'role' => strtoupper($user->role),
        ]);
    }
}