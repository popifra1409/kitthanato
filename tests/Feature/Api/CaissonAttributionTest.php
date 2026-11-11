<?php

namespace Tests\Feature\Api;

use App\Models\Caisson;
use App\Models\ChambreFroide;
use App\Models\Depot;
use App\Models\Sortie;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

class CaissonAttributionTest extends ApiTestCase
{
    private function creerChambre(string $nom, string $type, int $nombreCaissons): ChambreFroide
    {
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

    /** @return array<string, mixed> */
    private function creerDepot(): array
    {
        return $this->postJson('/api/depots', $this->depotValide())
            ->assertCreated()
            ->json('depot');
    }

    private function attribuer(int $depotId, int $caissonId): TestResponse
    {
        return $this->putJson("/api/depots/{$depotId}/box", [
            'caisson_id' => $caissonId,
        ]);
    }

    public function test_attribue_un_caisson_existant_au_depot(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Commune 1', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        $this->attribuer($depot['id'], $caisson->id)
            ->assertOk()
            ->assertJsonPath('depot.caisson_id', $caisson->id)
            ->assertJsonPath('depot.caisson.code', 'A1')
            ->assertJsonPath('depot.caisson.chambre_froide.nom', 'Commune 1');

        $this->assertDatabaseHas('depots', [
            'id' => $depot['id'],
            'caisson_id' => $caisson->id,
        ]);
    }

    public function test_un_caisson_inexistant_est_refuse(): void
    {
        $this->connecter('ADMIN');

        $depot = $this->creerDepot();

        $this->attribuer($depot['id'], 999999)
            ->assertStatus(422)
            ->assertJsonValidationErrors('caisson_id');
    }

    public function test_creation_avec_caisson_derive_l_emplacement(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Chambre Test', 'commune', 1);
        $caisson = $chambre->caissons->first();

        $donnees = array_merge($this->depotValide(), ['caisson_id' => $caisson->id]);
        unset($donnees['emplacement']);

        $id = $this->postJson('/api/depots', $donnees)
            ->assertCreated()
            ->assertJsonPath('depot.caisson_id', $caisson->id)
            ->assertJsonPath('depot.emplacement', 'Chambre Test · A1')
            ->json('depot.id');

        $this->assertDatabaseHas('depots', [
            'id' => $id,
            'caisson_id' => $caisson->id,
            'emplacement' => 'Chambre Test · A1',
        ]);
    }

    public function test_creation_sans_emplacement_ni_caisson_reste_a_attribuer(): void
    {
        $this->connecter('ADMIN');

        $donnees = $this->depotValide();
        unset($donnees['emplacement']);

        $this->postJson('/api/depots', $donnees)
            ->assertCreated()
            ->assertJsonPath('depot.emplacement', '')
            ->assertJsonPath('depot.caisson_id', null);

        $this->assertDatabaseHas('depots', [
            'code' => $donnees['code'],
            'caisson_id' => null,
            'emplacement' => '',
        ]);
    }

    public function test_l_attribution_met_a_jour_l_emplacement(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Chambre Libellé', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        $this->attribuer($depot['id'], $caisson->id)
            ->assertOk()
            ->assertJsonPath('depot.emplacement', 'Chambre Libellé · A1');
    }

    public function test_une_chambre_individuelle_n_accepte_qu_un_seul_corps(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Individuelle 1', 'individuelle', 1);
        $caisson = $chambre->caissons->first();

        $premier = $this->creerDepot();
        $second = $this->creerDepot();

        $this->attribuer($premier['id'], $caisson->id)->assertOk();

        // Réattribution au même corps : autorisée (il ne se bloque pas lui-même).
        $this->attribuer($premier['id'], $caisson->id)->assertOk();

        $reponse = $this->attribuer($second['id'], $caisson->id)->assertStatus(422);
        $this->assertStringContainsString('déjà occupé', $reponse->json('message'));

        $this->assertDatabaseHas('depots', [
            'id' => $second['id'],
            'caisson_id' => null,
        ]);
    }

    public function test_une_chambre_commune_accepte_plusieurs_corps(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Commune 2', 'commune', 1);
        $caisson = $chambre->caissons->first();

        $premier = $this->creerDepot();
        $second = $this->creerDepot();

        $this->attribuer($premier['id'], $caisson->id)->assertOk();
        $this->attribuer($second['id'], $caisson->id)->assertOk();

        $this->assertSame(2, Depot::where('caisson_id', $caisson->id)->count());
    }

    public function test_un_caisson_ou_une_chambre_desactive_est_refuse(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Commune 3', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        $caisson->update(['actif' => false]);
        $this->attribuer($depot['id'], $caisson->id)->assertStatus(422);
        $this->assertNull(Depot::find($depot['id'])->caisson_id);

        $caisson->update(['actif' => true]);
        $chambre->update(['actif' => false]);
        $this->attribuer($depot['id'], $caisson->id)->assertStatus(422);
    }

    public function test_un_corps_qui_n_est_plus_present_ne_peut_pas_recevoir_un_caisson(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Commune 4', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        Sortie::create([
            'depot_id' => $depot['id'],
            'date' => now()->toDateString(),
            'heure' => '10:00',
            'recuperateur' => 'Famille',
            'montant' => 1000,
            'montant_paye' => 1000,
            'statut' => 'VALIDE',
        ]);

        $this->attribuer($depot['id'], $caisson->id)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Seul un corps présent peut recevoir un caisson.');
    }

    public function test_la_liste_des_caissons_disponibles_marque_les_occupations(): void
    {
        $this->connecter('ADMIN');

        $commune = $this->creerChambre('Commune A', 'commune', 2);
        $individuelle = $this->creerChambre('Individuelle B', 'individuelle', 1);

        $premier = $this->creerDepot();
        $second = $this->creerDepot();

        $caissonCommune = $commune->caissons->firstWhere('code', 'A1');
        $caissonIndividuel = $individuelle->caissons->first();

        $this->attribuer($premier['id'], $caissonCommune->id)->assertOk();
        $this->attribuer($second['id'], $caissonIndividuel->id)->assertOk();

        $chambres = collect($this->getJson('/api/caissons-disponibles')->assertOk()->json('chambres'))
            ->keyBy('nom');

        $this->assertSame(1, $chambres['Commune A']['caissons'][0]['occupants']);
        $this->assertTrue($chambres['Commune A']['caissons'][0]['disponible']);
        $this->assertFalse($chambres['Individuelle B']['caissons'][0]['disponible']);
        $this->assertSame(1, $chambres['Individuelle B']['caissons'][0]['capacite']);

        // Le corps en cours de réattribution ne bloque pas son propre caisson.
        $pourSecond = collect(
            $this->getJson("/api/caissons-disponibles?depot_id={$second['id']}")
                ->assertOk()
                ->json('chambres')
        )->firstWhere('nom', 'Individuelle B');

        $this->assertSame(0, $pourSecond['caissons'][0]['occupants']);
        $this->assertTrue($pourSecond['caissons'][0]['disponible']);

        // Un caisson désactivé disparaît de la liste.
        $commune->caissons()->where('code', 'A2')->update(['actif' => false]);

        $communeApres = collect($this->getJson('/api/caissons-disponibles')->json('chambres'))
            ->firstWhere('nom', 'Commune A');

        $this->assertSame(['A1'], array_column($communeApres['caissons'], 'code'));
    }

    public function test_un_caisson_est_libere_quand_le_corps_a_une_date_de_sortie(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Individuelle 2', 'individuelle', 1);
        $caisson = $chambre->caissons->first();

        $premier = $this->creerDepot();
        $second = $this->creerDepot();

        $this->attribuer($premier['id'], $caisson->id)->assertOk();

        Depot::find($premier['id'])->update(['date_sortie' => now()->toDateString()]);

        $this->attribuer($second['id'], $caisson->id)->assertOk();
        $this->assertSame($caisson->id, Depot::find($second['id'])->caisson_id);
    }

    public function test_un_thanatopracteur_peut_attribuer_un_caisson(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Commune 5', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        $this->connecter('USER1');

        $this->attribuer($depot['id'], $caisson->id)->assertOk();
    }

    public function test_un_transfert_interne_peut_cibler_un_caisson(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Transfert Commune', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        $this->postJson('/api/transferts', [
            'depot_id' => $depot['id'],
            'date' => now()->toDateString(),
            'heure' => '11:00',
            'type' => 'interne',
            'motif' => 'Réorganisation',
            'caisson_id' => $caisson->id,
        ])
            ->assertCreated()
            ->assertJsonPath(
                'emplacement_destination',
                'Transfert Commune · A1'
            );

        $this->assertDatabaseHas('depots', [
            'id' => $depot['id'],
            'caisson_id' => $caisson->id,
            'emplacement' => 'Transfert Commune · A1',
        ]);
    }

    public function test_un_transfert_interne_refuse_un_caisson_individuel_occupe(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Transfert Individuelle', 'individuelle', 1);
        $caisson = $chambre->caissons->first();

        $premier = $this->creerDepot();
        $second = $this->creerDepot();

        $this->attribuer($premier['id'], $caisson->id)->assertOk();

        $reponse = $this->postJson('/api/transferts', [
            'depot_id' => $second['id'],
            'date' => now()->toDateString(),
            'heure' => '11:00',
            'type' => 'interne',
            'motif' => 'Réorganisation',
            'caisson_id' => $caisson->id,
        ])->assertStatus(422);

        $this->assertStringContainsString('déjà occupé', $reponse->json('message'));
        $this->assertNull(Depot::find($second['id'])->caisson_id);
    }

    public function test_l_attribution_exige_la_permission_depots_update(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->creerChambre('Commune 6', 'commune', 1);
        $caisson = $chambre->caissons->first();
        $depot = $this->creerDepot();

        Sanctum::actingAs(User::factory()->create());

        $this->attribuer($depot['id'], $caisson->id)->assertForbidden();
        $this->getJson('/api/caissons-disponibles')->assertForbidden();

        $this->assertNull(Depot::find($depot['id'])->caisson_id);
    }
}
