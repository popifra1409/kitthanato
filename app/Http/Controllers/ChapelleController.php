<?php

namespace App\Http\Controllers;

use App\Models\Chapelle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChapelleController extends Controller
{
    public function index()
    {
        return response()->json(
            Chapelle::orderBy('nom')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255|unique:chapelles,nom',
            'prix' => 'required|numeric|min:0',
            'actif' => 'boolean',
        ]);

        $chapelle = Chapelle::create($validated);

        return response()->json($chapelle, 201);
    }

    public function update(Request $request, Chapelle $chapelle)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255|unique:chapelles,nom,' . $chapelle->id,
            'prix' => 'required|numeric|min:0',
            'actif' => 'boolean',
        ]);

        $chapelle->update($validated);

        return response()->json($chapelle);
    }

    public function destroy(Chapelle $chapelle)
    {
        $chapelle->delete();

        return response()->json([
            'message' => 'Chapelle supprimée.'
        ]);
    }
}