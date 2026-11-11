<?php

namespace Tests\Feature\Api;

use App\Models\Caisson;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sortie;

class DashboardTest extends ApiTestCase
{
    public function test_le_tableau_de_bord_agrege_les_indicateurs(): void
    {
        $this->connecter('ADMIN');

        $chambre = $this->postJson('/api/chambres-froides', [
            'nom' => 'Chambre TdB',
            'type' => 'commune',
            'nombre_caissons' => 2,
        ])->assertCreated()->json();

        $caisson = Caisson::where('chambre_froide_id', $chambre['id'])
            ->orderBy('position')
            ->firstOrFail();

        $present = $this->postJson('/api/depots', $this->depotValide([
            'nom' => 'PRESENT',
        ]))->assertCreated()->json('depot');

        $parti = $this->postJson('/api/depots', $this->depotValide([
            'nom' => 'PARTI',
        ]))->assertCreated()->json('depot');

        $sansCaisson = $this->postJson('/api/depots', $this->depotValide([
            'nom' => 'ATTENTE',
        ]))->assertCreated()->json('depot');

        $this->putJson("/api/depots/{$present['id']}/box", [
            'caisson_id' => $caisson->id,
        ])->assertOk();

        $this->putJson("/api/depots/{$sansCaisson['id']}/sceller")
            ->assertOk();

        Sortie::create([
            'depot_id' => $parti['id'],
            'date' => now()->toDateString(),
            'heure' => '11:00',
            'statut' => 'SORTI',
            'recuperateur' => 'Famille',
            'montant_total' => 100,
            'montant_paye' => 100,
            'reste_a_payer' => 0,
        ]);

        Sortie::create([
            'depot_id' => $parti['id'],
            'date' => now()->toDateString(),
            'heure' => '12:00',
            'statut' => 'EN COURS',
            'recuperateur' => 'Famille',
            'montant_total' => 40,
            'montant_paye' => 0,
            'reste_a_payer' => 40,
        ]);

        $reponse = $this->getJson('/api/dashboard')->assertOk()->json();

        $this->assertSame(2, $reponse['compteurs']['presents']);
        $this->assertSame(3, $reponse['compteurs']['admissions']);
        $this->assertSame(3, $reponse['compteurs']['admissions_aujourdhui']);
        $this->assertSame(2, $reponse['compteurs']['sorties']);
        $this->assertSame(2, $reponse['compteurs']['sorties_aujourdhui']);
        $this->assertSame(1, $reponse['compteurs']['scelles']);
        $this->assertSame(1, $reponse['compteurs']['non_attribues']);
        $this->assertNull($reponse['tendances']['admissions']['variation']);

        $this->assertSame(14, $reponse['serie']['jours']);
        $this->assertCount(14, $reponse['serie']['points']);

        $dernier = $reponse['serie']['points'][13];

        $this->assertSame(now()->toDateString(), $dernier['date']);
        $this->assertSame(3, $dernier['admissions']);
        $this->assertSame(2, $dernier['sorties']);

        $this->assertSame(2, $reponse['occupation']['totaux']['actifs']);
        $this->assertSame(1, $reponse['occupation']['totaux']['occupes']);
        $this->assertSame(1, $reponse['occupation']['totaux']['libres']);
        $this->assertSame(50, $reponse['occupation']['totaux']['taux']);

        $this->assertSame('Chambre TdB', $reponse['occupation']['chambres'][0]['nom']);
        $this->assertSame(1, $reponse['occupation']['chambres'][0]['occupes']);
        $this->assertSame(50, $reponse['occupation']['chambres'][0]['taux']);

        $this->assertCount(3, $reponse['dernieres_admissions']);

        $statuts = collect($reponse['dernieres_admissions'])->pluck('statut', 'nom');

        $this->assertSame('PRÉSENT', $statuts['PRESENT']);
        $this->assertSame('SORTI', $statuts['PARTI']);

        $attente = collect($reponse['dernieres_admissions'])
            ->firstWhere('nom', 'ATTENTE');

        $this->assertTrue($attente['scelle']);

        $this->assertCount(2, $reponse['dernieres_sorties']);

        $this->assertSame(1, $reponse['alertes']['non_attribues']['total']);
        $this->assertSame(
            $sansCaisson['id'],
            $reponse['alertes']['non_attribues']['corps'][0]['id']
        );
        $this->assertSame(1, $reponse['alertes']['scelles']['total']);
        $this->assertSame(1, $reponse['alertes']['impayes']['total']);
        $this->assertEquals(40, $reponse['alertes']['impayes']['montant']);

        $this->assertEquals(140, $reponse['finance']['mois']['facture']);
        $this->assertEquals(100, $reponse['finance']['mois']['paye']);
        $this->assertEquals(40, $reponse['finance']['mois']['restant']);

        $this->assertEquals(0.0, $reponse['conservation']['duree_moyenne_jours']);
    }

    public function test_le_tableau_de_bord_cache_les_modules_sans_permission(): void
    {
        $role = Role::create([
            'code' => 'LECTEUR',
            'libelle' => 'Lecteur',
            'description' => 'Tableau de bord uniquement.',
        ]);
        $role->permissions()->attach(
            Permission::where('code', 'dashboard.view')->firstOrFail()
        );

        $this->connecter('LECTEUR');

        $reponse = $this->getJson('/api/dashboard')->assertOk()->json();

        $this->assertSame(0, $reponse['compteurs']['presents']);
        $this->assertNull($reponse['compteurs']['sorties']);
        $this->assertNull($reponse['compteurs']['transferts']);
        $this->assertNull($reponse['compteurs']['scelles']);
        $this->assertNull($reponse['occupation']);
        $this->assertNull($reponse['finance']);
        $this->assertSame([], $reponse['dernieres_admissions']);
        $this->assertSame([], $reponse['dernieres_sorties']);

        $this->assertArrayNotHasKey('non_attribues', $reponse['alertes']);
        $this->assertArrayNotHasKey('impayes', $reponse['alertes']);
    }

    public function test_le_tableau_de_bord_exige_la_permission_dashboard_view(): void
    {
        $this->connecter('USER1');

        $this->getJson('/api/dashboard')->assertForbidden();
    }
}
