<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Corbeille extends Model
{
    protected $table = 'corbeille';

    protected $fillable = [
        'element_type',
        'element_id',
        'donnees',
        'user_id',
        'user_name',
        'ip_address',
        'raison',
    ];

    protected $casts = [
        'donnees' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}