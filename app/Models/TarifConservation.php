<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class TarifConservation extends Model
{
    use TracksUser, LogsActivity;   // comme Depot ; retirez-les si vous avez une erreur

    protected string $auditModule = 'TARIFS';

    protected $table = 'tarifs_conservation';

    protected $fillable = ['prix'];   // le nom de l'emplacement n'est pas modifiable

    protected $casts = ['prix' => 'decimal:2'];

    public function auditLabel(): string
    {
        return "Tarif {$this->emplacement}";
    }
}
