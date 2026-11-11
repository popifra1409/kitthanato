<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChambreFroide extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'EMPLACEMENTS';

    public const TYPES = [
        'commune' => 'Chambre froide commune',
        'individuelle' => 'Chambre froide individuelle',
    ];

    protected $table = 'chambres_froides';

    protected $fillable = [
        'nom',
        'type',
        'description',
        'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    public function caissons(): HasMany
    {
        return $this->hasMany(Caisson::class)
            ->orderBy('position')
            ->orderBy('code');
    }

    public function auditLabel(): string
    {
        return 'Chambre froide « ' . $this->nom . ' » (#' . $this->getKey() . ')';
    }
}
