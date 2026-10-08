<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Historique;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class GestionUtilisateurController extends Controller
{
    public function index()
    {
        return response()->json(
            User::select(
                'id',
                'name',
                'role',
                'created_at'
            )
            ->orderBy('name')
            ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                'unique:users,name',
            ],

            'password' => [
                'required',
                'string',
                'min:6',
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in([
                    'ADMIN',
                    'USER1',
                    'USER2',
                ]),
            ],
        ]);

        $user = User::create([
            'name' => trim($data['name']),
            'password' => Hash::make($data['password']),
            'role' => strtoupper($data['role']),
        ]);

        $this->audit(
            'UTILISATEURS',
            'AJOUT',
            "Création du compte {$user->name}",
            [
                'user_id' => $user->id,
                'role' => $user->role,
            ]
        );

        return response()->json([
            'message' => 'Compte créé avec succès.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
        ], 201);
    }

    public function update(
        Request $request,
        $id
    ) {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('users', 'name')
                    ->ignore($user->id),
            ],

            'password' => [
                'nullable',
                'string',
                'min:6',
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in([
                    'ADMIN',
                    'USER1',
                    'USER2',
                ]),
            ],
        ]);

        $ancien = [
            'name' => $user->name,
            'role' => $user->role,
        ];

        $user->name = trim($data['name']);
        $user->role = strtoupper($data['role']);

        if (!empty($data['password'])) {
            $user->password = Hash::make(
                $data['password']
            );
        }

        $user->save();

        $this->audit(
            'UTILISATEURS',
            'MODIFICATION',
            "Modification du compte {$user->name}",
            [
                'avant' => $ancien,
                'apres' => [
                    'name' => $user->name,
                    'role' => $user->role,
                ],
            ]
        );

        return response()->json([
            'message' => 'Compte modifié avec succès.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
        ]);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if (
            auth()->id() &&
            auth()->id() == $user->id
        ) {
            return response()->json([
                'message' =>
                    'Vous ne pouvez pas supprimer votre propre compte.'
            ], 422);
        }

        $nom = $user->name;

        $this->audit(
            'UTILISATEURS',
            'SUPPRESSION',
            "Suppression du compte {$nom}",
            [
                'user_id' => $user->id,
                'role' => $user->role,
            ]
        );

        $user->delete();

        return response()->json([
            'message' => 'Compte supprimé avec succès.'
        ]);
    }

    
}