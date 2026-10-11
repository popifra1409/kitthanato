<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;
    use TracksUser, LogsActivity;

    protected string $auditModule = 'UTILISATEURS';

    protected array $auditExclude = ['last_login_at', 'last_login_ip'];

    public function auditLabel(): string
    {
        return "Utilisateur « {$this->name} »";
    }

    protected $fillable = [
        'name',
        'password',
        'role_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /* Champ « role » (code texte) conservé pour la compatibilité du front. */
    protected $appends = ['role'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /** Cache mémoire des permissions pour la requête en cours. */
    protected ?array $permissionsCache = null;

    /* ------------------------------------------------------------
       RELATIONS
    ------------------------------------------------------------ */

    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function getRoleAttribute(): ?string
    {
        return $this->roleModel?->code;
    }

    /* ------------------------------------------------------------
       AUTORISATIONS
    ------------------------------------------------------------ */

    public function isSuperAdmin(): bool
    {
        return (bool) $this->roleModel?->isSuperAdmin();
    }

    /** Liste des codes de permission (ex. "depots.view"). */
    public function permissionCodes(): array
    {
        if ($this->permissionsCache !== null) {
            return $this->permissionsCache;
        }

        if (!$this->roleModel) {
            return $this->permissionsCache = [];
        }

        return $this->permissionsCache = $this->roleModel
            ->permissions()
            ->pluck('code')
            ->all();
    }

    /** Vrai si l'utilisateur a AU MOINS une des permissions données. */
    public function hasPermission(string|array $permissions): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->isSuperAdmin()) {
            return true;
        }

        $codes = $this->permissionCodes();

        foreach ((array) $permissions as $permission) {
            if (in_array($permission, $codes, true)) {
                return true;
            }
        }

        return false;
    }

    public function flushPermissionsCache(): void
    {
        $this->permissionsCache = null;
        $this->unsetRelation('roleModel');
    }

    /** Représentation renvoyée au front (login, /me). */
    public function toAuthPayload(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'role_libelle' => $this->roleModel?->libelle,
            'permissions' => $this->isSuperAdmin()
                ? array_merge(['*'], Permission::pluck('code')->all())
                : $this->permissionCodes(),
        ];
    }
}
