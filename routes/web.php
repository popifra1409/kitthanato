<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Application React (SPA)
|--------------------------------------------------------------------------
| Toutes les URL qui ne commencent pas par /api (ni /up, /sanctum, /storage)
| renvoient la vue unique qui monte l'application React. Le routage côté
| client est ensuite géré par react-router-dom.
*/
Route::view('/{any?}', 'app')
    ->where('any', '^(?!api|sanctum|storage|up|build).*$')
    ->name('spa');
