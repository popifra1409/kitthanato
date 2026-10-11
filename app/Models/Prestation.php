<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class Prestation extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'PRESTATIONS';

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