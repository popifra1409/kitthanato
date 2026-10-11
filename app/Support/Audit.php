<?php

namespace App\Support;

use App\Models\Historique;
use Illuminate\Database\Eloquent\Model;
use Throwable;

/**
 * Journal d'audit : « qui a fait quoi, quand, depuis où ».
 *
 * Les créations / modifications / suppressions des modèles qui utilisent
 * le trait LogsActivity sont enregistrées automatiquement. Ce service sert
 * aussi pour les actions métier explicites (connexion, paiement, ...).
 */
class Audit
{
    /** Permet de couper temporairement le journal (imports, seeders). */
    protected static bool $enabled = true;

    public static function disable(): void { static::$enabled = false; }
    public static function enable(): void { static::$enabled = true; }

    public static function withoutLogging(callable $callback): mixed
    {
        $avant = static::$enabled;
        static::$enabled = false;
        try {
            return $callback();
        } finally {
            static::$enabled = $avant;
        }
    }

    public static function log(
        string $module,
        string $action,
        ?string $description = null,
        array $details = [],
        ?Model $subject = null,
        ?Model $user = null,
    ): ?Historique {
        if (!static::$enabled) {
            return null;
        }

        try {
            $user ??= auth()->user();
            $request = app()->runningInConsole() && !app()->runningUnitTests() ? null : request();

            return Historique::create([
                'user_id' => $user?->getKey(),
                'user_name' => $user?->name ?? (app()->runningInConsole() ? 'Console' : 'Système'),
                'module' => strtoupper($module),
                'action' => strtoupper($action),
                'auditable_type' => $subject ? $subject->getMorphClass() : null,
                'auditable_id' => $subject?->getKey(),
                'description' => $description,
                'ip_address' => $request?->ip(),
                'user_agent' => $request ? substr((string) $request->userAgent(), 0, 255) : null,
                'details' => $details ?: null,
            ]);
        } catch (Throwable $e) {
            // Le journal ne doit jamais bloquer l'action métier.
            report($e);
            return null;
        }
    }
}
