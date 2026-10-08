<?php

namespace App\Http\Controllers;

use App\Models\Historique;
use Illuminate\Http\Request;

class HistoriqueController extends Controller
{
    public function index(Request $request)
    {
        $query = Historique::with('user:id,name,role')
            ->orderByDesc('created_at');

        if ($request->filled('module')) {
            $query->where(
                'module',
                $request->module
            );
        }

        if ($request->filled('action')) {
            $query->where(
                'action',
                $request->action
            );
        }

        if ($request->filled('recherche')) {

            $recherche = $request->recherche;

            $query->where(function ($q) use ($recherche) {

                $q->where(
                    'description',
                    'ILIKE',
                    "%{$recherche}%"
                )

                ->orWhere(
                    'module',
                    'ILIKE',
                    "%{$recherche}%"
                )

                ->orWhere(
                    'action',
                    'ILIKE',
                    "%{$recherche}%"
                );
            });
        }

        return response()->json(
            $query->paginate(50)
        );
    }
}