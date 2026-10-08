<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinanceToSortie extends Model
{
    protected $table = 'finance_to_sortie';

    protected $fillable = [
        'sortie_id',
        'type',
        'libelle',
        'montant',
        'jours',
        'montant_prestations',
        'montant_nuits',
        'montant_chapelle',
        'montant_total',
        'montant_paye',
        'reste_a_payer',
        'caisse',
        'chapelle',
        'prestations',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'jours' => 'integer',
        'montant_prestations' => 'decimal:2',
        'montant_nuits' => 'decimal:2',
        'montant_chapelle' => 'decimal:2',
        'montant_total' => 'decimal:2',
        'montant_paye' => 'decimal:2',
        'reste_a_payer' => 'decimal:2',
        'prestations' => 'array',
    ];

    public function sortie()
    {
        return $this->belongsTo(Sortie::class);
    }
}