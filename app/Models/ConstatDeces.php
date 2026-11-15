<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ConstatDeces extends Model
{
    use SoftDeletes;

    protected $table = 'constat_deces';

    protected $fillable = [
        'depot_id',
        'reference',
        'nom',
        'prenom',
        'sexe',
        'date_naissance',
        'age',
        'lieu_deces',
        'date_deces',
        'heure_deces',
        'praticien',
        'date_constat',
        'heure_constat',
        'circonstance_1',
        'circonstance_2',
        'circonstance_3',
        'obstacle_medico_legal',
        'fait_a',
        'fait_le',
        'fait_heure',
        'createur_id',
        'modificateur_id',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_deces'     => 'date',
        'date_constat'   => 'date',
        'fait_le'        => 'date',
        'age'            => 'integer',
    ];

    /* =========================================================
       RELATIONS
    ========================================================= */

    public function depot()
    {
        return $this->belongsTo(Depot::class);
    }

    public function createur()
    {
        return $this->belongsTo(User::class, 'createur_id');
    }

    public function modificateur()
    {
        return $this->belongsTo(User::class, 'modificateur_id');
    }

    /* =========================================================
       GÉNÉRATION DE LA RÉFÉRENCE
       Format : AAAA/NNN/HGY/DMR/CD (NNN = séquence annuelle)
       Appelé DANS une transaction avec lockForUpdate().
    ========================================================= */

    public static function genererReference(): string
    {
        $annee = now()->year;

        $dernier = self::query()
            ->where('reference', 'like', "{$annee}/%")
            ->orderByRaw('CAST(SUBSTRING(reference, 6, 3) AS INTEGER) DESC')
            ->lockForUpdate()
            ->first();

        $numero = 1;

        if ($dernier) {
            $parties = explode('/', $dernier->reference);
            $numero = ((int) ($parties[1] ?? 0)) + 1;
        }

        return sprintf('%d/%03d/HGY/DMR/CD', $annee, $numero);
    }
}