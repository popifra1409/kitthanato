<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $recherche = trim($request->query('recherche', ''));

        $services = Service::query()
            ->when($recherche !== '', function ($query) use ($recherche) {
                $query->where('nom', 'ILIKE', '%' . $recherche . '%');
            })
            ->orderBy('nom')
            ->limit(50)
            ->get();

        return response()->json($services);
    }

    public function store(Request $request)
    {
        $request->merge([
            'nom' => trim((string) $request->input('nom')),
        ]);

        $validated = $request->validate([
            'nom' => 'required|string|max:150|unique:services,nom',
        ], [
            'nom.required' => 'Le nom du service est obligatoire.',
            'nom.unique' => 'Ce service existe déjà.',
            'nom.max' => 'Le nom du service ne doit pas dépasser 150 caractères.',
        ]);

        $service = Service::create($validated);

        return response()->json($service, 201);
    }
}