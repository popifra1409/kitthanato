<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Levee extends Model
{
    use HasFactory;

    protected $fillable = [
        'sortie_id',
        'date',
        'heure',
        'chapelle',
        'statut',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /**
     * Une levée appartient à une sortie.
     */
    public function sortie()
    {
        return $this->belongsTo(Sortie::class);
    }
}