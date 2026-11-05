<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;
use App\Models\Prestation;
use App\Models\Sortie;
use App\Models\Transfert;

class Depot extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'DEPOTS';

    public function auditLabel(): string
    {
        return "Dépôt {$this->code} – {$this->nom} {$this->prenom}";
    }

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
        'box_name',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_deces' => 'date',
        'date_arrivee' => 'date',
        'date_sortie' => 'date',

        'scelle' => 'boolean',
        'scelle_le' => 'datetime',

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

     public function depositants()
    {
        return $this->hasMany(\App\Models\Deposant::class);
    }

    public function scelleur()
{
    return $this->belongsTo(\App\Models\User::class, 'scelle_par')
        ->withTrashed()->select('id', 'name');
}

public function estScelle(): bool
{
    return (bool) $this->scelle;
}

}