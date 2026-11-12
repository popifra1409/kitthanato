<?php

namespace Tests\Feature\Api;

use App\Models\Caisson;
use App\Models\ChambreFroide;
use App\Models\Depot;

class EmplacementTest extends ApiTestCase
{
    private function creerChambre(
        string $nom,
        string $type,
        int $nombreCaissons
    ): ChambreFroide {
        $chambre = ChambreFroide::create([
            'nom' => $nom,
            'type' => $type,
            'actif' => true,
        ]);

        for ($i = 1; $i <= $nombreCaissons; $i++) {
            $chambre->caissons()->create([
                'code' => "A{$i}",
                'position' => $i,
                'actif' => true,
            ]);
        }

        return $chambre->load('caissons');
    }

    public function test_creation_genere_automatiquement_les_caissons(): void
    {
        $this->connecter('ADMIN');

        $reponse = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre commune 1',
            'type' => 'commune',
            'description' => 'Aile droite',
            'nombre_caissons' => 3,
        ])->assertCreated();

        $this->assertCount(3, $reponse->json('caissons'));
        $this->assertSame(
            ['A1', 'A2', 'A3'],
            array_column($reponse->json('caissons'), 'code')
        );
        $this->assertDatabaseHas('chambres_froides', [
            'nom' => 'Chambre commune 1',
            'type' => 'commune',
            'actif' => true,
        ]);
        $this->assertSame(3, Caisson::count());
    }

    public function test_un_caisson_ajoute_sans_code_suit_la_serie(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre individuelle 1',
            'type' => 'individuelle',
            'nombre_caissons' => 2,
        ])->assertCreated()->json();

        $this->postJson("/api/chambres-froides/{$chambre['id']}/caissons", [
            'code' => '',
        ])->assertCreated()->assertJsonPath('code', 'A3');
    }

    public function test_le_code_est_unique_a_l_interieur_d_une_chambre(): void
    {
        $this->connecter('ADMIN');

        $premiere = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre A',
            'type' => 'commune',
            'nombre_caissons' => 1,
        ])->assertCreated()->json();

        $seconde = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre B',
            'type' => 'commune',
            'nombre_caissons' => 0,
        ])->assertCreated()->json();

        $this->postJson("/api/chambres-froides/{$premiere['id']}/caissons", [
            'code' => 'A1',
        ])->assertStatus(422)->assertJsonValidationErrors('code');

        // Le même code reste autorisé dans une autre chambre.
        $this->postJson("/api/chambres-froides/{$seconde['id']}/caissons", [
            'code' => 'A1',
        ])->assertCreated();
    }

    public function test_chambre_et_caisson_peuvent_etre_desactives_puis_reactivees(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre C',
            'type' => 'commune',
            'nombre_caissons' => 1,
        ])->assertCreated()->json();

        $this->putJson("/api/chambres-froides/{$chambre['id']}/actif")
            ->assertOk()
            ->assertJsonPath('actif', false);

        $caisson = Caisson::firstOrFail();

        $this->putJson("/api/caissons/{$caisson->id}/actif")
            ->assertOk()
            ->assertJsonPath('actif', false);

        $this->putJson("/api/chambres-froides/{$chambre['id']}/actif")
            ->assertOk()
            ->assertJsonPath('actif', true);
    }

    public function test_un_utilisateur_sans_permission_est_refuse(): void
    {
        $this->connecter('USER1');

        $this->getJson('/api/chambres-froides')->assertForbidden();

        $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre interdite',
            'type' => 'commune',
        ])->assertForbidden();

        $this->assertSame(0, ChambreFroide::count());
    }

    public function test_le_plan_presente_les_corps_places_et_non_attribues(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre Plan',
            'type' => 'commune',
            'nombre_caissons' => 2,
        ])->assertCreated()->json();

        $caisson = Caisson::where('chambre_froide_id', $chambre['id'])
            ->orderBy('position')
            ->firstOrFail();

        $place = $this->postJson('/api/depots', $this->depotValide())
            ->assertCreated()
            ->json('depot');
        $attente = $this->postJson('/api/depots', $this->depotValide())
            ->assertCreated()
            ->json('depot');

        $this->putJson("/api/depots/{$place['id']}/box", [
            'caisson_id' => $caisson->id,
        ])->assertOk();

        $plan = $this->getJson('/api/emplacements/plan')->assertOk()->json();

        $this->assertSame(2, $plan['totaux']['caissons']);
        $this->assertSame(1, $plan['totaux']['occupes']);
        $this->assertSame(1, $plan['totaux']['corps']);
        $this->assertSame(1, $plan['totaux']['non_attribues']);

        $chambrePlan = collect($plan['chambres'])->firstWhere('nom', 'Chambre Plan');
        $premier = $chambrePlan['caissons'][0];

        $this->assertSame('A1', $premier['code']);
        $this->assertCount(1, $premier['corps']);
        $corpsP = $premier['corps'][0];
        $this->assertSame($place['id'], $corpsP['id']);
        $this->assertSame($place['code'], $corpsP['code']);
        $this->assertSame(60, $corpsP['age']);
        $this->assertSame('Interne', $corpsP['provenance']);
        $this->assertSame($caisson->id, $corpsP['caisson_id']);
        $this->assertSame(
            now()->subDay()->toDateString(),
            $corpsP['date_deces']
        );

        $corpsAttente = collect($plan['non_attribues'])
            ->firstWhere('id', $attente['id']);
        $this->assertNotNull($corpsAttente);
        $this->assertNull($corpsAttente['caisson_id']);

        // Un corps sorti libère le caisson et quitte le plan.
        Depot::find($place['id'])->update([
            'date_sortie' => now()->toDateString(),
        ]);

        $plan = $this->getJson('/api/emplacements/plan')->assertOk()->json();

        $this->assertSame(0, $plan['totaux']['corps']);
        $this->assertSame(0, $plan['totaux']['occupes']);
    }

    public function test_l_ordre_des_caissons_peut_etre_modifie(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Chambre Ordre', 'commune', 3);
        $ids = $chambre->caissons->pluck('id')->all();

        $this->putJson("/api/chambres-froides/{$chambre->id}/caissons/ordre", [
            'caissons' => [$ids[2], $ids[0], $ids[1]],
        ])->assertOk();

        $this->assertSame(
            [$ids[2], $ids[0], $ids[1]],
            Caisson::where('chambre_froide_id', $chambre->id)
                ->orderBy('position')
                ->pluck('id')
                ->all()
        );

        $plan = $this->getJson('/api/emplacements/plan')->assertOk()->json();
        $chambrePlan = collect($plan['chambres'])->firstWhere('id', $chambre->id);

        $this->assertSame(
            [$ids[2], $ids[0], $ids[1]],
            array_column($chambrePlan['caissons'], 'id')
        );
    }

    public function test_l_ordre_refuse_une_liste_incomplete_ou_etrangere(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Chambre Ordre 2', 'commune', 2);
        $autre = $this->creerChambre('Chambre Voisine', 'commune', 1);
        $ids = $chambre->caissons->pluck('id')->all();

        /* Liste incomplète */
        $this->putJson("/api/chambres-froides/{$chambre->id}/caissons/ordre", [
            'caissons' => [$ids[0]],
        ])->assertStatus(422)->assertJsonValidationErrors('caissons');

        /* Caisson d'une autre chambre */
        $this->putJson("/api/chambres-froides/{$chambre->id}/caissons/ordre", [
            'caissons' => [$ids[0], $ids[1], $autre->caissons->first()->id],
        ])->assertStatus(422)->assertJsonValidationErrors('caissons');
    }

    public function test_le_plan_exige_la_permission_emplacements_view(): void
    {
        $this->connecter('USER1');

        $this->getJson('/api/emplacements/plan')->assertForbidden();
    }
}
