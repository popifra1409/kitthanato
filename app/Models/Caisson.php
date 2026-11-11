<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Caisson extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'EMPLACEMENTS';

    protected $table = 'caissons';

    protected $fillable = [
        'chambre_froide_id',
        'code',
        'position',
        'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
        'position' => 'integer',
    ];

    public function chambreFroide(): BelongsTo
    {
        return $this->belongsTo(ChambreFroide::class);
    }

    public function depots(): HasMany
    {
        return $this->hasMany(Depot::class);
    }

    public function auditLabel(): string
    {
        return 'Caisson « ' . $this->code . ' » (chambre #' . $this->chambre_froide_id . ')';
    }
}
