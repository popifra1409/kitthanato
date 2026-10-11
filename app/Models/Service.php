<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Models\Concerns\TracksUser;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use TracksUser, LogsActivity;

    protected string $auditModule = 'SERVICES';

    protected $fillable = ['nom'];
}