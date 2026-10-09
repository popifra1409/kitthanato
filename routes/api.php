<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthentificationController;
use App\Http\Controllers\GestionUtilisateurController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\SortieController;
use App\Http\Controllers\LeveeController;
use App\Http\Controllers\TransfertController;
use App\Http\Controllers\PrestationController;
use App\Http\Controllers\ProfessionController;
use App\Http\Controllers\ChapelleController;
use App\Http\Controllers\StatistiqueController;
use App\Http\Controllers\CorbeilleController;
use App\Http\Controllers\HistoriqueController;
use App\Http\Controllers\DeclarationDecesController;
use App\Http\Controllers\ServiceController;

/* =====================================================
   AUTHENTIFICATION
===================================================== */
Route::post('/login', [AuthentificationController::class, 'login']);

/* =====================================================
   ROUTES PUBLIQUES (pas de token requis)
   → Utilisées par le front sans configuration spéciale
===================================================== */

/* ---------- DÉPÔTS ---------- */
Route::get('/depots', [DepotController::class, 'index']);
Route::get('/depots-disponibles', [DepotController::class, 'corpsDisponibles']);
Route::get('/depots/{id}', [DepotController::class, 'show']);
Route::post('/depots', [DepotController::class, 'store']);
Route::put('/depots/{id}', [DepotController::class, 'update']);
Route::delete('/depots/{id}', [DepotController::class, 'destroy']);

/* ---------- SORTIES ---------- */
Route::get('/sorties', [SortieController::class, 'index']);
Route::get('/sorties/corps-disponibles', [SortieController::class, 'corpsDisponibles']);
Route::post('/sorties', [SortieController::class, 'store']);
Route::put('/sorties/{id}', [SortieController::class, 'update']);
Route::delete('/sorties/{id}', [SortieController::class, 'destroy']);
Route::post('/sorties/{id}/paiement', [SortieController::class, 'paiement']);

/* ---------- TRANSFERTS ---------- */
Route::get('/transferts', [TransfertController::class, 'index']);
Route::post('/transferts', [TransfertController::class, 'store']);
Route::put('/transferts/{transfert}', [TransfertController::class, 'update']);
Route::delete('/transferts/{transfert}', [TransfertController::class, 'destroy']);

/* ---------- LEVÉES ---------- */
Route::get('/levees', [LeveeController::class, 'index']);

/* ---------- PRESTATIONS / CHAPELLES / PROFESSIONS ---------- */
Route::get('/prestations', [PrestationController::class, 'index']);
Route::get('/chapelles', [ChapelleController::class, 'index']);
Route::get('/professions', [ProfessionController::class, 'index']);
Route::post('/professions', [ProfessionController::class, 'store']);

/* ---------- DÉCLARATIONS ---------- */
Route::get('/declarations/dashboard', [DeclarationDecesController::class, 'dashboard']);
Route::get('/declarations/defunts', [DeclarationDecesController::class, 'defunts']);
Route::get('/declarations/depot/{id}', [DeclarationDecesController::class, 'depot']);
Route::get('/declarations', [DeclarationDecesController::class, 'index']);
Route::post('/declarations', [DeclarationDecesController::class, 'store']);
Route::get('/declarations/{id}', [DeclarationDecesController::class, 'show']);
Route::put('/declarations/{id}', [DeclarationDecesController::class, 'update']);
Route::delete('/declarations/{id}', [DeclarationDecesController::class, 'destroy']);

Route::get('/services', [ServiceController::class, 'index']);
Route::post('/services', [ServiceController::class, 'store']);
/* =====================================================
   ROUTES PROTÉGÉES 
===================================================== */
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthentificationController::class, 'logout']);
    Route::get('/me', [AuthentificationController::class, 'me']);

    Route::middleware('role:ADMIN')->group(function () {

        /* UTILISATEURS */
        Route::get('/utilisateurs', [GestionUtilisateurController::class, 'index']);
        Route::post('/utilisateurs', [GestionUtilisateurController::class, 'store']);
        Route::put('/utilisateurs/{id}', [GestionUtilisateurController::class, 'update']);
        Route::delete('/utilisateurs/{id}', [GestionUtilisateurController::class, 'destroy']);

        /* CORBEILLE (non vidable) */
        Route::get('/corbeille', [CorbeilleController::class, 'index']);
        Route::get('/corbeille/{id}', [CorbeilleController::class, 'show']);

        /* HISTORIQUE */
        Route::get('/historique', [HistoriqueController::class, 'index']);

        /* STATISTIQUES */
        Route::get('/statistiques', [StatistiqueController::class, 'index']);

        /* PRESTATIONS ADMIN */
        Route::get('/prestations-admin', [PrestationController::class, 'indexAdmin']);
        Route::post('/prestations', [PrestationController::class, 'store']);
        Route::put('/prestations/{id}', [PrestationController::class, 'update']);
        Route::delete('/prestations/{id}', [PrestationController::class, 'destroy']);

        /* CHAPELLES ADMIN */
        Route::get('/chapelles-admin', [ChapelleController::class, 'indexAdmin']);
        Route::post('/chapelles', [ChapelleController::class, 'store']);
        Route::put('/chapelles/{chapelle}', [ChapelleController::class, 'update']);
        Route::delete('/chapelles/{chapelle}', [ChapelleController::class, 'destroy']);
                                          
    });
});