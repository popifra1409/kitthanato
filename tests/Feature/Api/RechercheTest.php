<?php

namespace Tests\Feature\Api;

use App\Models\Caisson;
use App\Models\Permission;
use App\Models\Role;

class RechercheTest extends ApiTestCase
{
    private function jeuDeDonnees(): array
    {
        $chambre = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre Recherche',
            'type' => 'commune',
            'nombre_caissons' => 1,
        ])->assertCreated()->json();

        $caisson = Caisson::where('chambre_froide_id', $chambre['id'])
            ->orderBy('position')
            ->firstOrFail();

        $doe = $this->postJson('/api/depots', $this->depotValide([
            'nom' => 'DOE',
            'prenom' => 'John',
        ]))->assertCreated()->json('depot');

        $koffi = $this->postJson('/api/depots', $this->depotValide([
            'nom' => 'KOFFI',
            'prenom' => 'Ama',
        ]))->assertCreated()->json('depot');

        $this->putJson("/api/depots/{$doe['id']}/box", [
            'caisson_id' => $caisson->id,
        ])->assertOk();

        $sortie = $this->postJson('/api/sorties', [
            'depot_id' => $doe['id'],
            'date' => now()->toDateString(),
            'heure' => '11:00',
            'recuperateur' => 'Mme KONE',
            'duree_levee' => 60,
            'prestations' => [],
        ])->assertCreated()->json();

        $declaration = $this->postJson('/api/declarations', [
            'depot_id' => $koffi['id'],
            'nom' => 'KOFFI',
            'prenom' => 'Ama',
            'declarant_nom' => 'KONE Mamadou',
        ])->assertCreated()->json();

        return compact('caisson', 'doe', 'koffi', 'sortie', 'declaration');
    }

    public function test_la_recherche_trouve_les_corps_par_nom_et_par_caisson(): void
    {
        $this->connecter('ADMIN');

        ['caisson' => $caisson, 'doe' => $doe] = $this->jeuDeDonnees();

        $parNom = $this->getJson('/api/recherche?q=doe')->assertOk()->json();

        $this->assertSame(1, count($parNom['corps']));
        $this->assertSame($doe['id'], $parNom['corps'][0]['id']);
        $this->assertSame('PRÉSENT', $parNom['corps'][0]['statut']);
        $this->assertSame($caisson->code, $parNom['corps'][0]['caisson']);
        $this->assertSame('Chambre Recherche', $parNom['corps'][0]['chambre']);

        $parCaisson = $this->getJson("/api/recherche?q={$caisson->code}")
            ->assertOk()
            ->json();

        $this->assertSame($doe['id'], $parCaisson['corps'][0]['id']);

        $parChambre = $this->getJson('/api/recherche?q=Chambre%20Recherche')
            ->assertOk()
            ->json();

        $this->assertSame($doe['id'], $parChambre['corps'][0]['id']);
    }

    public function test_la_recherche_trouve_les_sorties_et_les_declarations(): void
    {
        $this->connecter('ADMIN');

        ['sortie' => $sortie, 'declaration' => $declaration] = $this->jeuDeDonnees();

        $reponse = $this->getJson('/api/recherche?q=kone')
            ->assertOk()
            ->json();

        $this->assertSame('Mme KONE', $reponse['sorties'][0]['recuperateur']);
        $this->assertSame($sortie['id'], $reponse['sorties'][0]['id']);
        $this->assertSame('KONE Mamadou', $reponse['declarations'][0]['declarant_nom'] ?? null);
        $this->assertSame(
            $declaration['numero_declaration'],
            $reponse['declarations'][0]['numero_declaration']
        );

        $parNumero = $this->getJson(
            '/api/recherche?q=' . urlencode($declaration['numero_declaration'])
        )->assertOk()->json();

        $this->assertSame($declaration['id'], $parNumero['declarations'][0]['id']);
    }

    public function test_la_recherche_ignore_la_casse_et_ne_prend_pas_les_jokers_pour_des_jokers(): void
    {
        $this->connecter('ADMIN');

        $this->jeuDeDonnees();

        $majuscules = $this->getJson('/api/recherche?q=DOE')->assertOk()->json();
        $minuscules = $this->getJson('/api/recherche?q=doe')->assertOk()->json();

        $this->assertSame($majuscules['total'], $minuscules['total']);
        $this->assertSame(1, count($minuscules['corps']));

        $joker = $this->getJson('/api/recherche?q=d%25')->assertOk()->json();

        $this->assertSame(0, $joker['total']);
        $this->assertSame([], $joker['corps']);
    }

    public function test_la_recherche_exige_deux_caracteres(): void
    {
        $this->connecter('ADMIN');

        $this->jeuDeDonnees();

        $reponse = $this->getJson('/api/recherche?q=d')->assertOk()->json();

        $this->assertSame(0, $reponse['total']);
        $this->assertArrayNotHasKey('corps', $reponse);
        $this->assertArrayNotHasKey('sorties', $reponse);
        $this->assertArrayNotHasKey('declarations', $reponse);
    }

    public function test_la_recherche_masque_les_modules_sans_permission(): void
    {
        $this->connecter('ADMIN');
        $this->jeuDeDonnees();

        $role = Role::create([
            'code' => 'SANS_DOSSIER',
            'libelle' => 'Sans dossier',
            'description' => 'Aucun accès aux dossiers.',
        ]);
        $role->permissions()->attach(
            Permission::where('code', 'dashboard.view')->firstOrFail()
        );

        $this->connecter('SANS_DOSSIER');

        $reponse = $this->getJson('/api/recherche?q=doe')->assertOk()->json();

        $this->assertSame(0, $reponse['total']);
        $this->assertArrayNotHasKey('corps', $reponse);
        $this->assertArrayNotHasKey('sorties', $reponse);
        $this->assertArrayNotHasKey('declarations', $reponse);
    }
}
