<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'ROLES';

    public function auditLabel(): string
    {
        return "Rôle « {$this->libelle} » ({$this->code})";
    }

    protected $fillable = [
        'code',
        'libelle',
        'description',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->code === config('permissions.super_admin_role');
    }
}
