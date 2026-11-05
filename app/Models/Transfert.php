<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class Transfert extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'TRANSFERTS';

    protected $fillable = [
        'date',
        'heure',
        'depot_id',
        'provenance',
        'type',
        'motif',
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