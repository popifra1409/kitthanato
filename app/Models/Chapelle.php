<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Chapelle extends Model
{
    protected $table = 'chapelles';

    protected $fillable = [
        'nom',
        'prix',
        'actif',
    ];

    protected $casts = [
        'prix' => 'decimal:2',
        'actif' => 'boolean',
    ];
}