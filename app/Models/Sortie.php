<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class Sortie extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'SORTIES';

    protected $fillable = [
        'depot_id',
        'date',
        'heure',
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
        'date'                => 'date',
        'prestations'         => 'array',
        'chapelle_active'     => 'boolean',
        'montant'             => 'decimal:2',
        'montant_prestations' => 'decimal:2',
        'montant_caisse'      => 'decimal:2',
        'montant_nuits'       => 'decimal:2',
        'montant_chapelle'    => 'decimal:2',
        'montant_total'       => 'decimal:2',
        'montant_paye'        => 'decimal:2',
        'reste_a_payer'       => 'decimal:2',
        'chapelle_prix'       => 'decimal:2',
    ];

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
}