<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Levee extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'LEVEES';

    use HasFactory;

    protected $fillable = [
        'sortie_id',
        'date',
        'heure',
        'chapelle',
        'statut',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /**
     * Une levée appartient à une sortie.
     */
    public function sortie()
    {
        return $this->belongsTo(Sortie::class);
    }
}