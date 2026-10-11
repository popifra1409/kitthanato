<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Remplit automatiquement created_by / updated_by avec l'utilisateur
 * connecté et expose les relations createur() / modificateur().
 *
 * La table doit posséder les colonnes created_by et updated_by
 * (voir la migration add_traceability_columns).
 */
trait TracksUser
{
    public static function bootTracksUser(): void
    {
        static::creating(function ($model) {
            $id = auth()->id();
            if ($id) {
                $model->created_by ??= $id;
                $model->updated_by ??= $id;
            }
        });

        static::updating(function ($model) {
            $id = auth()->id();
            if ($id && !$model->isDirty('updated_by')) {
                $model->updated_by = $id;
            }
        });
    }

    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed()->select('id', 'name');
    }

    public function modificateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by')->withTrashed()->select('id', 'name');
    }

    /** Relations de traçabilité à charger : ->with(Model::TRACE) */
    public const TRACE = ['createur', 'modificateur'];
}
