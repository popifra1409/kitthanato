<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Etat extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'ETATS';

    protected $fillable = [
        'nom',
    ];

    public function depots(): HasMany
    {
        return $this->hasMany(Depot::class);
    }
}