<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class Chapelle extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'CHAPELLES';

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