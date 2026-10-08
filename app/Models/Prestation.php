<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prestation extends Model
{
    protected $fillable = [
        'nom',
        'prix',
        'obligatoire',
        'actif',
    ];

    protected $casts = [
        'prix' => 'decimal:2',
        'obligatoire' => 'boolean',
        'actif' => 'boolean',
    ];
    public function finances()
{
    return $this->hasMany(FinanceToSortie::class);
}
}