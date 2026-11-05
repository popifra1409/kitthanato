<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NomCertificat extends Model
{
    protected $table = 'nom_certificats';

    protected $fillable = [
        'nom',
        'type',
    ];
}