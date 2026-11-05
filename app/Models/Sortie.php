<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class Sortie extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'SORTIES';

    protected $fillable = [
        'depot_id',
        'date',
        'heure',
        'duree_levee',
        'recuperateur',
        'recuperateur_cni',
        'montant',
        'statut',
        'caisse',
        'nombre_jours',
        'jours',
        'prestations',
        'montant_prestations',
        'montant_caisse',
        'montant_nuits',
        'montant_chapelle',
        'montant_total',
        'montant_paye',
        'reste_a_payer',
        'chapelle',
        'chapelle_active',
        'chapelle_id',
        'chapelle_nom',
        'chapelle_prix',
    ];

    protected $casts = [
        'date'                => 'date',       // ⚠ reste un cast date, géré par les accessors
        'prestations'         => 'array',
        'chapelle_active'     => 'boolean',
        'montant'             => 'decimal:2',
        'montant_prestations' => 'decimal:2',
        'montant_caisse'      => 'decimal:2',
        'montant_nuits'       => 'decimal:2',
        'montant_chapelle'    => 'decimal:2',
        'duree_levee'         => 'integer',
        'montant_total'       => 'decimal:2',
        'montant_paye'        => 'decimal:2',
        'reste_a_payer'       => 'decimal:2',
        'chapelle_prix'       => 'decimal:2',
    ];

    /* =========================================================
       RELATIONS
    ========================================================= */

    public function depot()
    {
        return $this->belongsTo(Depot::class);
    }

    public function levee()
    {
        return $this->hasOne(Levee::class);
    }

    public function finances()
    {
        return $this->hasMany(FinanceToSortie::class);
    }

    /* =========================================================
       ACCESSORS UTILITAIRES (créneau)
    ========================================================= */

    /**
     * Retourne "YYYY-MM-DD" sous forme de chaîne,
     * quel que soit le type interne de $this->date (Carbon ou string).
     */
    public function getDateStringAttribute(): ?string
    {
        if (!$this->date) return null;

        if ($this->date instanceof \DateTimeInterface) {
            return $this->date->format('Y-m-d');
        }

        return substr((string) $this->date, 0, 10);
    }

    /**
     * Retourne "HH:mm:ss" normalisé, quel que soit le format d'entrée
     * (H:i ou H:i:s).
     */
    public function getHeureNormaliseeAttribute(): ?string
    {
        if (!$this->heure) return null;

        $heure = (string) $this->heure;

        return strlen($heure) === 5 ? $heure . ':00' : $heure;
    }

    /**
     * Début de la sortie (date + heure) sous forme de Carbon,
     * ou null si l'un des deux champs est manquant.
     */
    public function getDebutAttribute(): ?Carbon
    {
        $dateStr  = $this->date_string;
        $heureStr = $this->heure_normalisee;

        if (!$dateStr || !$heureStr) return null;

        try {
            return Carbon::parse($dateStr . ' ' . $heureStr);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Fin de la sortie (début + duree_levee en minutes).
     */
    public function getFinAttribute(): ?Carbon
    {
        if (!$this->debut) return null;

        return $this->debut->copy()->addMinutes(
            (int) ($this->duree_levee ?? 60)
        );
    }

    /**
     * Format "H:i" du début, pour l'affichage.
     */
    public function getDebutFormateAttribute(): string
    {
        return $this->debut?->format('H:i') ?? '—';
    }

    /**
     * Format "H:i" de la fin, pour l'affichage.
     */
    public function getFinFormateAttribute(): string
    {
        return $this->fin?->format('H:i') ?? '—';
    }
}