<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CertificatGenreMort extends Model
{
    protected $table = 'certificat_genre_morts';

    protected $fillable = [
        'depot_id',
        'donnees',
        'genres',
    ];

    protected $casts = [
        'donnees' => 'array',
        'genres' => 'array',
    ];

    public function depot()
    {
        return $this->belongsTo(Depot::class, 'depot_id');
    }
}