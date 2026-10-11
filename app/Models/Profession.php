<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class Profession extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'PROFESSIONS';

    protected $fillable = [
        'nom'
    ];
}