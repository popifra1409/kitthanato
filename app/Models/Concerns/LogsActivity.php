<?php

namespace App\Models\Concerns;

use App\Support\Audit;
use Illuminate\Support\Str;

/**
 * Enregistre automatiquement dans le journal d'audit chaque création,
 * modification (avec avant / après des seuls champs modifiés) et
 * suppression du modèle.
 *
 * Personnalisation possible dans le modèle :
 *   protected string $auditModule = 'DEPOTS';
 *   protected array  $auditExclude = ['champ_volumineux'];
 *   public function auditLabel(): string { return "Dépôt {$this->code}"; }
 */
trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::created(function ($model) {
            Audit::log(
                $model->auditModuleName(),
                'CREATION',
                'Création : ' . $model->auditLabel(),
                ['apres' => $model->auditAttributes($model->getAttributes())],
                $model
            );
        });

        static::updated(function ($model) {
            $changes = $model->auditAttributes($model->getChanges());

            if (empty($changes)) {
                return;
            }

            $avant = array_intersect_key(
                $model->auditAttributes($model->getOriginal()),
                $changes
            );

            Audit::log(
                $model->auditModuleName(),
                'MODIFICATION',
                'Modification : ' . $model->auditLabel(),
                ['avant' => $avant, 'apres' => $changes],
                $model
            );
        });

        static::deleted(function ($model) {
            $soft = method_exists($model, 'isForceDeleting') && !$model->isForceDeleting();

            Audit::log(
                $model->auditModuleName(),
                'SUPPRESSION',
                'Suppression : ' . $model->auditLabel(),
                $soft ? [] : ['avant' => $model->auditAttributes($model->getAttributes())],
                $model
            );
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(function ($model) {
                Audit::log($model->auditModuleName(), 'RESTAURATION', 'Restauration : ' . $model->auditLabel(), [], $model);
            });
        }
    }

    public function auditModuleName(): string
    {
        return property_exists($this, 'auditModule')
            ? $this->auditModule
            : Str::upper(Str::snake(Str::pluralStudly(class_basename($this))));
    }

    public function auditLabel(): string
    {
        foreach (['code', 'numero_declaration', 'nom', 'name', 'libelle'] as $champ) {
            if (!empty($this->{$champ})) {
                return class_basename($this) . " « {$this->{$champ}} » (#{$this->getKey()})";
            }
        }

        return class_basename($this) . ' #' . $this->getKey();
    }

    /** Retire les champs techniques / sensibles du journal. */
    protected function auditAttributes(array $attributes): array
    {
        $exclus = array_merge(
            ['created_at', 'updated_at', 'deleted_at', 'updated_by', 'password', 'remember_token'],
            $this->getHidden(),
            property_exists($this, 'auditExclude') ? $this->auditExclude : []
        );

        $resultat = array_diff_key($attributes, array_flip($exclus));

        // Normalise les valeurs non scalaires (dates, JSON)
        foreach ($resultat as $cle => $valeur) {
            if ($valeur instanceof \DateTimeInterface) {
                $resultat[$cle] = $valeur->format('Y-m-d H:i:s');
            } elseif (is_string($valeur) && $this->hasCast($cle, ['array', 'json', 'object', 'collection'])) {
                $resultat[$cle] = json_decode($valeur, true);
            }
        }

        return $resultat;
    }
}
