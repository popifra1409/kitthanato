<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DeclarationDeces extends Model
{
    use HasFactory;

    protected $table = 'declaration_deces';

    protected $fillable = [

        'depot_id',
        'numero_declaration',

        'region',
        'departement',
        'arrondissement',
        'district_sante',
        'aire_sante',
        'formation_sanitaire',
        'ville_village_quartier',

        'nom',
        'prenom',
        'sexe',
        'date_naissance',
        'age',
        'lieu_naissance',
        'nationalite',
        'cni_autre',
        'profession',
        'domicile',
        'statut_matrimonial',

        'date_deces',
        'heure_deces',
        'lieu_deces',
        'site_deces',
        'circonstances_deces',

        'declarant_nom',
        'declarant_qualite',
        'declarant_contact',
        'declarant_signature',
        'declarant_date',

        'officier_nom',
        'officier_qualite',
        'centre_etat_civil',
        'date_reception',

        'cause_a',
        'cause_b',
        'cause_c',
        'cause_d',
        'autres_affections',

        'chirurgie_recente',
        'date_chirurgie',
        'raison_chirurgie',
        'autopsie',
        'resultats_autopsie_utilises',

        'genre_mort',
        'cause_mort',
        'cause_externe',
        'cause_indeterminee',
        'date_blessure',
        'description_cause_externe',
        'lieu_cause_externe',

        'grossesse_multiple',
        'mort_ne',
        'heures_survecues',
        'poids_naissance',
        'semaines_grossesse',
        'age_mere',
        'conditions_mere',
        'defunte_enceinte',
        'moment_grossesse',
        'grossesse_contribue_deces',

        'responsable_nom',
        'responsable_qualite',
        'responsable_date',
        'responsable_signature',

        'statut',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_deces' => 'date',
        'date_chirurgie' => 'date',
        'declarant_date' => 'date',
        'date_reception' => 'date',
        'responsable_date' => 'date',

        'heure_deces' => 'datetime:H:i',

        'age' => 'integer',
        'heures_survecues' => 'integer',
        'poids_naissance' => 'integer',
        'semaines_grossesse' => 'integer',
        'age_mere' => 'integer',
    ];

    public function depot()
    {
        return $this->belongsTo(Depot::class);
    }
}