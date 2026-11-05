<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthentificationController;
use App\Http\Controllers\GestionUtilisateurController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
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
use App\Http\Controllers\CertificatGenreMortController;
/*
|--------------------------------------------------------------------------
| API REST
|--------------------------------------------------------------------------
| Toutes les routes (sauf /login) exigent un token Sanctum ET un compte
| actif. Chaque route est ensuite protégée par une permission
| (voir config/permissions.php et le middleware « permission »).
*/

/* =====================================================
   AUTHENTIFICATION (publique, limitée à 10 essais / minute)
===================================================== */
Route::post('/login', [AuthentificationController::class, 'login'])
    ->middleware('throttle:10,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {

    /* ---------- SESSION ---------- */
    Route::post('/logout', [AuthentificationController::class, 'logout']);
    Route::get('/me', [AuthentificationController::class, 'me']);
    Route::put('/me/password', [AuthentificationController::class, 'changePassword']);

    /* ---------- RÉFÉRENTIELS (lecture pour tout utilisateur connecté) ---------- */
    Route::get('/prestations', [PrestationController::class, 'index']);
    Route::get('/chapelles', [ChapelleController::class, 'index']);
    Route::get('/professions', [ProfessionController::class, 'index']);
    Route::get('/services', [ServiceController::class, 'index']);

    /* Ajout rapide depuis le formulaire de dépôt */
    Route::post('/professions', [ProfessionController::class, 'store'])
        ->middleware('permission:depots.create|depots.update|referentiels.manage');
    Route::post('/services', [ServiceController::class, 'store'])
        ->middleware('permission:depots.create|depots.update|referentiels.manage');

    /* ---------- DÉPÔTS ---------- */
    Route::middleware('permission:depots.view')->group(function () {
        Route::get('/depots', [DepotController::class, 'index']);
        Route::get('/depots-disponibles', [DepotController::class, 'corpsDisponibles']);
        Route::get('/depots/{id}', [DepotController::class, 'show']);

    });
    Route::post('/depots', [DepotController::class, 'store'])->middleware('permission:depots.create');
    Route::put('/depots/{id}', [DepotController::class, 'update'])->middleware('permission:depots.update');
    Route::put('/depots/{id}/box', [DepotController::class, 'assignBox']);
    Route::delete('/depots/{id}', [DepotController::class, 'destroy'])->middleware('permission:depots.delete');

    Route::put('/depots/{id}/sceller', [DepotController::class, 'sceller'])->middleware('permission:depots.sceller');
Route::put('/depots/{id}/desceller', [DepotController::class, 'desceller'])->middleware('permission:depots.sceller');

    /* ---------- SORTIES ---------- */
    Route::middleware('permission:sorties.view')->group(function () {
        Route::get('/sorties', [SortieController::class, 'index']);
        Route::get('/sorties/corps-disponibles', [SortieController::class, 'corpsDisponibles']);
    });
    Route::post('/sorties', [SortieController::class, 'store'])->middleware('permission:sorties.create');
    Route::put('/sorties/{id}', [SortieController::class, 'update'])->middleware('permission:sorties.update');
    Route::delete('/sorties/{id}', [SortieController::class, 'destroy'])->middleware('permission:sorties.delete');
    Route::post('/sorties/{id}/paiement', [SortieController::class, 'paiement'])->middleware('permission:sorties.payer');

    /* ---------- TRANSFERTS ---------- */
    Route::get('/transferts', [TransfertController::class, 'index'])->middleware('permission:transferts.view');
    Route::post('/transferts', [TransfertController::class, 'store'])->middleware('permission:transferts.create');
    Route::put('/transferts/{transfert}', [TransfertController::class, 'update'])->middleware('permission:transferts.update');
    Route::delete('/transferts/{transfert}', [TransfertController::class, 'destroy'])->middleware('permission:transferts.delete');

    /* ---------- LEVÉES ---------- */
    Route::get('/levees', [LeveeController::class, 'index'])->middleware('permission:levees.view');

    /* ---------- DÉCLARATIONS ---------- */
    Route::middleware('permission:declarations.view')->group(function () {
        Route::get('/declarations/dashboard', [DeclarationDecesController::class, 'dashboard']);
        Route::get('/declarations/defunts', [DeclarationDecesController::class, 'defunts']);
        Route::get('/declarations/depot/{id}', [DeclarationDecesController::class, 'depot']);
        Route::get('/declarations', [DeclarationDecesController::class, 'index']);
        Route::get('/declarations/{id}', [DeclarationDecesController::class, 'show']);
    });
    Route::post('/declarations', [DeclarationDecesController::class, 'store'])->middleware('permission:declarations.create');
    Route::put('/declarations/{id}', [DeclarationDecesController::class, 'update'])->middleware('permission:declarations.update');
    Route::delete('/declarations/{id}', [DeclarationDecesController::class, 'destroy'])->middleware('permission:declarations.delete');

    /* ---------- STATISTIQUES ---------- */
    Route::get('/statistiques', [StatistiqueController::class, 'index'])->middleware('permission:statistiques.view');

    /* ---------- RÉFÉRENTIELS (administration) ---------- */
    Route::middleware('permission:referentiels.manage')->group(function () {
        Route::get('/prestations-admin', [PrestationController::class, 'indexAdmin']);
        Route::post('/prestations', [PrestationController::class, 'store']);
        Route::put('/prestations/{id}', [PrestationController::class, 'update']);
        Route::delete('/prestations/{id}', [PrestationController::class, 'destroy']);

        Route::get('/chapelles-admin', [ChapelleController::class, 'indexAdmin']);
        Route::post('/chapelles', [ChapelleController::class, 'store']);
        Route::put('/chapelles/{chapelle}', [ChapelleController::class, 'update']);
        Route::delete('/chapelles/{chapelle}', [ChapelleController::class, 'destroy']);

        Route::put('/services/{service}', [ServiceController::class, 'update']);
        Route::delete('/services/{service}', [ServiceController::class, 'destroy']);
    });

    /* ---------- UTILISATEURS ---------- */
    Route::get('/utilisateurs', [GestionUtilisateurController::class, 'index'])->middleware('permission:utilisateurs.view');
    Route::get('/utilisateurs/{id}', [GestionUtilisateurController::class, 'show'])->middleware('permission:utilisateurs.view');
    Route::post('/utilisateurs', [GestionUtilisateurController::class, 'store'])->middleware('permission:utilisateurs.create');
    Route::put('/utilisateurs/{id}', [GestionUtilisateurController::class, 'update'])->middleware('permission:utilisateurs.update');
    Route::post('/utilisateurs/{id}/toggle-actif', [GestionUtilisateurController::class, 'toggleActif'])->middleware('permission:utilisateurs.update');
    Route::delete('/utilisateurs/{id}', [GestionUtilisateurController::class, 'destroy'])->middleware('permission:utilisateurs.delete');

    /* ---------- RÔLES & PERMISSIONS ---------- */
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:roles.view|utilisateurs.view');
    Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:roles.view|utilisateurs.view');
    Route::get('/roles/{id}', [RoleController::class, 'show'])->middleware('permission:roles.view');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:roles.manage');
    Route::put('/roles/{id}', [RoleController::class, 'update'])->middleware('permission:roles.manage');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('permission:roles.manage');

    /* ---------- AUDIT ---------- */
    Route::get('/historique', [HistoriqueController::class, 'index'])->middleware('permission:historique.view');
    Route::get('/historique/filtres', [HistoriqueController::class, 'filtres'])->middleware('permission:historique.view');

    /* ---------- CORBEILLE (consultation uniquement, non vidable) ---------- */
    Route::get('/corbeille', [CorbeilleController::class, 'index'])->middleware('permission:corbeille.view');
    Route::get('/corbeille/{id}', [CorbeilleController::class, 'show'])->middleware('permission:corbeille.view');

// Certificat de genre de mort
Route::get('/certificats-genre-mort/noms', [CertificatGenreMortController::class, 'noms']);

Route::post('/certificats-genre-mort/noms', [CertificatGenreMortController::class, 'ajouterNom']);

Route::get('/certificats-genre-mort/depot/{depotId}', [CertificatGenreMortController::class,'show']);

Route::post('/certificats-genre-mort', [CertificatGenreMortController::class, 'store']);

Route::put('/certificats-genre-mort/{id}', [CertificatGenreMortController::class,'update']);

});
