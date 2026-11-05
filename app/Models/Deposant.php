<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Deposant extends Model
{
    use HasFactory;

    protected $table = 'depositants';

    protected $fillable = [
        'depot_id',
        'nom',
        'telephone',
        'cni',
        'lien_parente',
        'statut',
    ];

    public function depot()
    {
        return $this->belongsTo(Depot::class);
    }
}
