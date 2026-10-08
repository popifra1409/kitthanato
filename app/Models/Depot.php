<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Prestation;
use App\Models\Sortie;
use App\Models\Transfert;

class Depot extends Model
{
    protected $table = 'depots';

    protected $fillable = [
        'code',
        'code_defunt',
        'nom',
        'prenom',
        'sexe',
        'date_naissance',
        'age',
        'profession',
        'date_deces',
        'heure_deces',
        'date_arrivee',
        'heure_arrivee',
        'date_sortie',
        'provenance',
        'service_origine',
        'lieu_provenance',
        'motif',
        'etat',
        'emplacement',
        'chapelle',
        'contact_nom',
        'contact_telephone',
        'contact_cni',
        'lien_parente',
        'prestations',
        'montant_prestations',
        'statut',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_deces' => 'date',
        'date_arrivee' => 'date',
        'date_sortie' => 'date',

        'age' => 'integer',

        'prestations' => 'array',

        'montant_prestations' => 'decimal:2',
    ];


    /**
     * ============================================================
     * PRESTATIONS DU DÉPÔT
     * ============================================================
     */
    public function prestations()
    {
        return $this->belongsToMany(
            Prestation::class,
            'depot_prestation',
            'depot_id',
            'prestation_id'
        )->withPivot('prix');
    }


    /**
     * ============================================================
     * SORTIES DU DÉPÔT
     * ============================================================
     */
    public function sorties()
    {
        return $this->hasMany(Sortie::class);
    }


    /**
     * ============================================================
     * TRANSFERTS DU DÉPÔT
     * ============================================================
     */
    public function transferts()
    {
        return $this->hasMany(Transfert::class);
    }
}