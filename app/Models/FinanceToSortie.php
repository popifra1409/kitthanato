<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class FinanceToSortie extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'FINANCES';

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