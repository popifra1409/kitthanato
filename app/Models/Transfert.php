<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transfert extends Model
{
    protected $fillable = [
        'date',
        'heure',
        'depot_id',
        'type',
        'emplacement_destination',
        'destination',
        'statut',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function depot()
    {
        return $this->belongsTo(Depot::class);
    }
}