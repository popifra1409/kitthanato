<?php

namespace App\Http\Controllers;

use App\Models\Historique;
use Illuminate\Http\Request;

class HistoriqueController extends Controller
{
    /**
     * GET /api/historique
     * Filtres : module, action, user_id, du (Y-m-d), au (Y-m-d),
     *           recherche, sujet_type + sujet_id (historique d'un élément),
     *           per_page (défaut 50, max 200)
     */
    public function index(Request $request)
    {
        $query = Historique::with('user:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        foreach (['module', 'action'] as $champ) {
            if ($request->filled($champ)) {
                $query->where($champ, strtoupper($request->input($champ)));
            }
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('du')) {
            $query->whereDate('created_at', '>=', $request->date('du'));
        }

        if ($request->filled('au')) {
            $query->whereDate('created_at', '<=', $request->date('au'));
        }

        if ($request->filled('sujet_type') && $request->filled('sujet_id')) {
            $query->where('auditable_type', 'ILIKE', '%' . $request->sujet_type)
                ->where('auditable_id', $request->integer('sujet_id'));
        }

        if ($request->filled('recherche')) {
            $recherche = $request->recherche;

            $query->where(function ($q) use ($recherche) {
                $q->where('description', 'ILIKE', "%{$recherche}%")
                    ->orWhere('module', 'ILIKE', "%{$recherche}%")
                    ->orWhere('action', 'ILIKE', "%{$recherche}%")
                    ->orWhere('user_name', 'ILIKE', "%{$recherche}%");
            });
        }

        $parPage = min(max($request->integer('per_page', 50), 1), 200);

        return response()->json($query->paginate($parPage));
    }

    /** GET /api/historique/filtres — valeurs possibles pour les listes déroulantes */
    public function filtres()
    {
        return response()->json([
            'modules' => Historique::query()->distinct()->orderBy('module')->pluck('module'),
            'actions' => Historique::query()->distinct()->orderBy('action')->pluck('action'),
        ]);
    }
}
