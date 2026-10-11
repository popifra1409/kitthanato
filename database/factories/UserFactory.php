<?php

namespace Database\Factories;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->userName(),
            'password' => static::$password ??= Hash::make('password'),
            'is_active' => true,
        ];
    }

    /** Rattache l'utilisateur au rôle portant ce code. */
    public function role(string $code): static
    {
        return $this->state(fn () => [
            'role_id' => Role::where('code', $code)->value('id'),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
